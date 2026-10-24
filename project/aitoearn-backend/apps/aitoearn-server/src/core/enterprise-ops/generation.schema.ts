import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { EnterprisePlanResult } from '@yikart/aitoearn-ai-shared'

export enum GenerationStatus { Queued = 'queued', Running = 'running', Ready = 'ready', Failed = 'failed', Unknown = 'unknown' }
@Schema({ collection: 'enterpriseGenerations', timestamps: true, versionKey: false })
export class EnterpriseGeneration {
  _id: string
  createdAt: Date
  updatedAt: Date
  @Prop({ required: true, immutable: true }) enterpriseId: string
  @Prop({ required: true, immutable: true }) createdBy: string
  @Prop({ required: true, immutable: true }) requestId: string
  @Prop({ required: true, immutable: true }) taskId: string
  @Prop({ default: '', immutable: true }) retryOf: string
  @Prop({ required: true, immutable: true }) inputHash: string
  @Prop({ type: [String], required: true, immutable: true }) knowledgeIds: string[]
  @Prop({ default: '', immutable: true }) topicId: string
  @Prop({ type: Object, required: true, immutable: true }) snapshot: { sources: { id: string, title: string, category: string, body: string }[], topic: string }
  @Prop({ type: String, enum: GenerationStatus, default: GenerationStatus.Queued }) status: GenerationStatus
  @Prop() startedAt: Date
  @Prop({ type: Object }) result?: EnterprisePlanResult
  @Prop({ default: 'unknown' }) costStatus: string
  @Prop({ default: '' }) currency: string
  @Prop({ default: '' }) reconciliationReference: string
  @Prop() reconciliationKey?: string
  @Prop({ type: Number, default: null }) cost: number | null
  @Prop({ default: 'reserved' }) settlement: string
  @Prop({ default: '' }) errorCode: string
}
export const EnterpriseGenerationSchema = SchemaFactory.createForClass(EnterpriseGeneration)
EnterpriseGenerationSchema.index({ enterpriseId: 1, createdBy: 1, requestId: 1 }, { unique: true })
EnterpriseGenerationSchema.index({ status: 1, createdAt: 1 })
EnterpriseGenerationSchema.index({ enterpriseId: 1, reconciliationKey: 1 }, { unique: true, partialFilterExpression: { reconciliationKey: { $type: 'string' } } })
