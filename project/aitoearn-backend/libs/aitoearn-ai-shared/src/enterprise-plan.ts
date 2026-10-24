import { createZodDto } from '@yikart/common'
import { z } from 'zod'

export const EnterprisePlanInputSchema = z.object({
  sources: z.array(z.object({ id: z.string(), title: z.string().max(200), category: z.string(), body: z.string().max(20000) })).min(1).max(12),
  topic: z.string().max(2000),
})
export class EnterprisePlanInput extends createZodDto(EnterprisePlanInputSchema) {}
export const EnterprisePlanSelectionSchema = z.object({
  titleSourceId: z.string(),
  excerpts: z.array(z.object({ sourceId: z.string(), text: z.string().min(1).max(900) })).min(1).max(8),
  layout: z.enum(['cover', 'case', 'faq']),
})
export const EnterprisePlanResultSchema = EnterprisePlanSelectionSchema.extend({
  model: z.string(),
  provider: z.string(),
  providerRequestId: z.string().optional(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
})
export class EnterprisePlanResult extends createZodDto(EnterprisePlanResultSchema) {}
