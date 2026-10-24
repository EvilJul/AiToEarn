import { Inject, Injectable, Logger } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { AppException, ResponseCode } from '@yikart/common'
import { EnterpriseConflictException } from './enterprise-conflict.exception'
import { EnterpriseNotificationKind, EnterpriseRole } from './enterprise.enums'
import { EnterpriseRepository } from './enterprise.repository'
import { ENTERPRISE_OPTIONS, EnterpriseOptions, EnterpriseService } from './enterprise.service'
import { VersionActionDto } from './operations.dto'
import { EnterpriseOperationsRepository } from './operations.repository'
import { EnterpriseLead } from './operations.schema'

@Injectable()
export class EnterpriseNotificationsService {
  private readonly logger = new Logger(EnterpriseNotificationsService.name)

  constructor(
    private readonly access: EnterpriseService,
    private readonly enterprises: EnterpriseRepository,
    private readonly repository: EnterpriseOperationsRepository,
    @Inject(ENTERPRISE_OPTIONS) private readonly options: EnterpriseOptions,
  ) {}

  async deliver(lead: EnterpriseLead) {
    for (const event of lead.notificationEvents) {
      if (lead.deliveredKeys.includes(event.key))
        continue
      await this.repository.createEnterpriseNotification({ enterpriseId: lead.enterpriseId, createdBy: 'system', leadId: String(lead._id), targetUserId: event.targetUserId, summary: event.summary, kind: event.kind, eventKey: event.key })
      await this.repository.updateByLeadIdAndDeliveredKey(String(lead._id), lead.enterpriseId, event.key)
    }
    await this.repository.updateByLeadIdAndVersionAndNotificationPending(String(lead._id), lead.enterpriseId, lead.version)
  }

  async acknowledge(userId: string, enterpriseId: string, id: string, dto: VersionActionDto) {
    const { role } = await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Sales, EnterpriseRole.Operator])
    const notification = await this.repository.getByEnterpriseNotificationIdAndEnterpriseId(id, enterpriseId)
    if (!notification || (role !== EnterpriseRole.Admin && notification.targetUserId !== userId))
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    const updated = await this.repository.updateByEnterpriseNotificationIdAndEnterpriseIdAndVersion(id, enterpriseId, dto.expectedVersion, { state: 'acknowledged' })
    if (!updated)
      throw new EnterpriseConflictException()
    await this.access.audit(enterpriseId, userId, 'notification.acknowledged', id)
    return updated
  }

  @Interval(5000)
  async processPending() {
    if (!this.options.enabled)
      return
    let cursor = ''
    for (;;) {
      const enterprises = await this.enterprises.listByEnabledAfterId(cursor)
      if (!enterprises.length)
        break
      for (const enterprise of enterprises) {
        const enterpriseId = String(enterprise._id)
        const leads = await this.repository.listByEnterpriseIdAndReminderDue(enterpriseId, new Date(Date.now() - enterprise.responseReminderMinutes * 60000))
        for (const lead of leads) {
          const events = [...lead.notificationEvents]
          const conversation = await this.repository.getByEnterpriseConversationIdAndEnterpriseId(lead.conversationId, enterpriseId)
          const responseReminderPrepared = lead.responseReminderPrepared || lead.createdAt.getTime() <= Date.now() - enterprise.responseReminderMinutes * 60000
          if (!lead.responseReminderPrepared && responseReminderPrepared && conversation?.state === 'waiting_human')
            events.push({ key: `lead:${lead._id}:response-overdue`, targetUserId: enterprise.ownerUserId, summary: lead.summary.slice(0, 300), kind: EnterpriseNotificationKind.ResponseOverdue })
          const followUpDue = !!lead.nextFollowUpAt && lead.nextFollowUpAt <= new Date() && lead.followUpReminderFor?.getTime() !== lead.nextFollowUpAt.getTime()
          if (followUpDue && lead.nextFollowUpAt)
            events.push({ key: `lead:${lead._id}:followup:${lead.nextFollowUpAt.toISOString()}`, targetUserId: lead.ownerId || enterprise.ownerUserId, summary: lead.summary.slice(0, 300), kind: EnterpriseNotificationKind.FollowUp })
          await this.repository.updateByEnterpriseLeadIdAndEnterpriseIdAndVersion(String(lead._id), enterpriseId, lead.version, { responseReminderPrepared, followUpReminderFor: followUpDue ? lead.nextFollowUpAt : lead.followUpReminderFor, notificationEvents: events, notificationPending: events.length > lead.deliveredKeys.length })
        }
        for (const lead of await this.repository.listByEnterpriseIdAndNotificationPending(enterpriseId)) {
          try {
            await this.deliver(lead)
          }
          catch {
            this.logger.warn('Enterprise notification delivery deferred; the durable event remains pending')
          }
        }
      }
      cursor = String(enterprises[enterprises.length - 1]._id)
    }
  }
}
