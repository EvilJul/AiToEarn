import { DynamicModule, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { EnterpriseContentService } from './content.service'
import { EnterpriseConversationsService } from './conversations.service'
import { EnterpriseController } from './enterprise.controller'
import { EnterpriseRepository } from './enterprise.repository'
import { Enterprise, EnterpriseAuditEvent, EnterpriseAuditEventSchema, EnterpriseMembership, EnterpriseMembershipSchema, EnterpriseSchema } from './enterprise.schema'
import { ENTERPRISE_OPTIONS, EnterpriseOptions, EnterpriseService } from './enterprise.service'
import { EnterpriseExecutorsController } from './executors.controller'
import { EnterpriseExecutorRepository } from './executors.repository'
import { EnterpriseAccountLease, EnterpriseAccountLeaseSchema, EnterpriseExecutor, EnterpriseExecutorSchema } from './executors.schema'
import { EnterpriseExecutorsService } from './executors.service'
import { EnterpriseGenerationController } from './generation.controller'
import { EnterpriseGenerationRepository } from './generation.repository'
import { EnterpriseGeneration, EnterpriseGenerationSchema } from './generation.schema'
import { EnterpriseGenerationService } from './generation.service'
import { EnterpriseMaintenanceService } from './maintenance.service'
import { EnterpriseNotificationsService } from './notifications.service'
import { EnterpriseOperationsController } from './operations.controller'
import { EnterpriseOperationsRepository } from './operations.repository'
import { ContentRevision, ContentRevisionSchema, EnterpriseConversation, EnterpriseConversationSchema, EnterpriseLead, EnterpriseLeadSchema, EnterpriseMessage, EnterpriseMessageSchema, EnterpriseNotification, EnterpriseNotificationSchema, EnterprisePublishJob, EnterprisePublishJobSchema, KnowledgeVersion, KnowledgeVersionSchema, TopicCandidate, TopicCandidateSchema } from './operations.schema'
import { EnterprisePublishingService } from './publishing.service'
import { EnterpriseResourceRepository } from './resources.repository'
import { EnterpriseResourceBinding, EnterpriseResourceBindingSchema } from './resources.schema'
import { EnterpriseResourcesService } from './resources.service'

@Module({})
export class EnterpriseOpsModule {
  static forRoot(options: EnterpriseOptions): DynamicModule {
    return {
      module: EnterpriseOpsModule,
      imports: [MongooseModule.forFeature([
        { name: EnterpriseGeneration.name, schema: EnterpriseGenerationSchema },
        { name: Enterprise.name, schema: EnterpriseSchema },
        { name: EnterpriseExecutor.name, schema: EnterpriseExecutorSchema },
        { name: EnterpriseAccountLease.name, schema: EnterpriseAccountLeaseSchema },
        { name: EnterpriseMessage.name, schema: EnterpriseMessageSchema },
        { name: EnterpriseLead.name, schema: EnterpriseLeadSchema },
        { name: EnterpriseNotification.name, schema: EnterpriseNotificationSchema },

        { name: EnterpriseResourceBinding.name, schema: EnterpriseResourceBindingSchema },
        { name: KnowledgeVersion.name, schema: KnowledgeVersionSchema },
        { name: TopicCandidate.name, schema: TopicCandidateSchema },
        { name: ContentRevision.name, schema: ContentRevisionSchema },
        { name: EnterprisePublishJob.name, schema: EnterprisePublishJobSchema },
        { name: EnterpriseConversation.name, schema: EnterpriseConversationSchema },

        { name: EnterpriseMembership.name, schema: EnterpriseMembershipSchema },
        { name: EnterpriseAuditEvent.name, schema: EnterpriseAuditEventSchema },
      ])],
      controllers: [EnterpriseGenerationController, EnterpriseExecutorsController, EnterpriseController, EnterpriseOperationsController],
      providers: [EnterpriseGenerationService, EnterpriseGenerationRepository, EnterpriseNotificationsService, EnterpriseMaintenanceService, EnterpriseExecutorRepository, EnterpriseExecutorsService, EnterpriseResourceRepository, EnterpriseResourcesService, EnterpriseOperationsRepository, EnterpriseContentService, EnterprisePublishingService, EnterpriseConversationsService, EnterpriseRepository, EnterpriseService, { provide: ENTERPRISE_OPTIONS, useValue: options }],
      exports: [EnterpriseService],
    }
  }
}
