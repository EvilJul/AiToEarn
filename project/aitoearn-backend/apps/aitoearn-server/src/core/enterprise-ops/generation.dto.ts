import { EnterprisePlanResultSchema } from '@yikart/aitoearn-ai-shared'
import { createZodDto } from '@yikart/common'
import { z } from 'zod'
import { GenerationStatus } from './generation.schema'

export class CreateEnterpriseGenerationDto extends createZodDto(z.object({
  requestId: z.uuid(),
  knowledgeIds: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).min(1).max(12),
  topicId: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  retryOf: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
})) {}
export class EnterpriseGenerationVo extends createZodDto(z.object({
  id: z.string(),
  taskId: z.string(),
  retryOf: z.string(),
  createdAt: z.coerce.date(),
  status: z.enum(GenerationStatus),
  knowledgeIds: z.array(z.string()),
  topicId: z.string(),
  draft: z.object({ title: z.string(), body: z.string(), layout: z.string(), missingCategories: z.array(z.string()) }).optional(),
  result: EnterprisePlanResultSchema.optional(),
  cost: z.number().nullable(),
  costStatus: z.string(),
  currency: z.string(),
  reconciliationReference: z.string(),
  settlement: z.string(),
  errorCode: z.string(),
})) {}

export class ReconcileEnterpriseUsageDto extends createZodDto(z.object({
  cost: z.number().nonnegative().finite(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  reference: z.string().trim().min(1).max(500),
})) {}
