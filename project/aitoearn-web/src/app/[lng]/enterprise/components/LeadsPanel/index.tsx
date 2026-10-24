'use client'

/** LeadsPanel - 有消息依据的线索、销售跟进与站内通知。 */

import type { Enterprise } from '@/api/enterprise/enterprise.types'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { recordAction, runAction } from '../../store/workspace.actions'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { RecordList, RecordRow } from '../RecordList'

export function LeadsPanel({ enterprise }: { enterprise: Enterprise }) {
  const { t, i18n } = useTransClient('enterprise')
  const inboxUnavailable = useWorkspaceStore(s => s.inboxUnavailable)
  const leads = useWorkspaceStore(s => s.data.leads)
  const notifications = useWorkspaceStore(s => s.data.notifications)
  const openForm = useWorkspaceStore(s => s.openForm)
  return (
    <div className="space-y-6">
      {inboxUnavailable && <p role="status" className="text-sm text-destructive">{t('inboxUnavailable')}</p>}
      <h3 className="text-lg font-semibold">{t('leads')}</h3>
      {!leads.length ? <p className="text-sm text-muted-foreground">{t('noLeads')}</p> : (
        <RecordList>
          {leads.map(lead => (
            <RecordRow
              key={lead.id}
              title={t(`intent.${lead.intent}`)}
              detail={(
                <>
                  {lead.summary}
                  <p className="mt-2">
                    {t(`stage.${lead.stage}`)}
                    {' '}
                    ·
                    {' '}
                    {lead.ownerId ? t('assigned') : t('unassigned')}
                  </p>
                  {lead.nextFollowUpAt && (
                    <p>
                      {t('nextFollowUp')}
                      :
                      {' '}
                      {new Intl.DateTimeFormat(i18n.language, { timeZone: enterprise.timezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lead.nextFollowUpAt))}
                    </p>
                  )}
                  {lead.followUps.map((note, index) => <p key={index}>{note}</p>)}
                </>
              )}
            >
              {['admin', 'sales'].includes(enterprise.role) && <Button variant="outline" onClick={() => openForm({ title: t('followUp'), fields: [{ name: 'stage', label: t('leadStage'), type: 'select', defaultValue: lead.stage, options: ['new', 'qualified', 'scheduled', 'won', 'lost'].map(value => ({ value, label: t(`stage.${value}`) })) }, { name: 'nextFollowUpAt', label: t('nextFollowUp'), type: 'datetime-local', required: false }, { name: 'note', label: t('fields.followUp'), type: 'textarea' }], submit: values => recordAction(`leads/${lead.id}/follow-ups`, { ...values, expectedVersion: lead.version, nextFollowUpAt: values.nextFollowUpAt ? new Date(values.nextFollowUpAt).toISOString() : null }) })}>{t('followUp')}</Button>}
            </RecordRow>
          ))}
        </RecordList>
      )}
      {!!notifications.length && (
        <section className="space-y-3">
          <h3 className="font-semibold">{t('notifications')}</h3>
          <RecordList>
            {notifications.map(notification => (
              <RecordRow
                key={notification.id}
                title={t(`notificationKind.${notification.kind}`)}
                status={notification.state}
                detail={(
                  <>
                    {notification.summary}
                    <p>{t('notificationHelp')}</p>
                  </>
                )}
              >
                {notification.state !== 'acknowledged' && <Button variant="outline" onClick={() => runAction(notification.id, () => recordAction(`notifications/${notification.id}/acknowledge`, { expectedVersion: notification.version }))}>{t('markRead')}</Button>}
              </RecordRow>
            ))}
          </RecordList>
        </section>
      )}
    </div>
  )
}
