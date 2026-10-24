import { Inject, Injectable } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { KnowledgeStatus } from './enterprise.enums'
import { ENTERPRISE_OPTIONS, EnterpriseOptions, EnterpriseService } from './enterprise.service'
import { EnterpriseOperationsRepository } from './operations.repository'

@Injectable()
export class EnterpriseMaintenanceService {
  constructor(private readonly access: EnterpriseService, private readonly repository: EnterpriseOperationsRepository, @Inject(ENTERPRISE_OPTIONS) private readonly options: EnterpriseOptions) {}

  @Interval(60000)
  async expireKnowledge() {
    if (!this.options.enabled)
      return
    for (;;) {
      const expired = await this.repository.listByKnowledgeExpiry()
      if (!expired.length)
        break
      for (const knowledge of expired) {
        const updated = await this.repository.updateByKnowledgeVersionIdAndEnterpriseIdAndVersion(String(knowledge._id), knowledge.enterpriseId, knowledge.version, { status: KnowledgeStatus.Withdrawn })
        if (updated) {
          await this.repository.updateByPublishKnowledgeId(knowledge.enterpriseId, String(knowledge._id))
          await this.access.audit(knowledge.enterpriseId, 'system', 'knowledge.expired', String(knowledge._id))
        }
      }
    }
  }
}
