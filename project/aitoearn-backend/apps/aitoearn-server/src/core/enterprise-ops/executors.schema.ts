import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

@Schema({ collection: 'enterpriseExecutors', timestamps: true, versionKey: false })
export class EnterpriseExecutor {
  _id: string

  @Prop({ required: true, immutable: true })
  enterpriseId: string

  @Prop({ required: true, immutable: true })
  createdBy: string

  @Prop({ required: true, immutable: true })
  accountId: string

  @Prop({ required: true, immutable: true })
  deviceId: string

  @Prop({ required: true })
  pluginVersion: string

  @Prop({ type: [String], default: [] })
  capabilities: string[]

  @Prop({ type: Date, required: true })
  lastHeartbeatAt: Date

  @Prop({ type: Date, default: null })
  revokedAt: Date | null
}
export const EnterpriseExecutorSchema = SchemaFactory.createForClass(EnterpriseExecutor)
EnterpriseExecutorSchema.index({ enterpriseId: 1, deviceId: 1, accountId: 1 }, { unique: true })

@Schema({ collection: 'enterpriseAccountLeases', timestamps: true, versionKey: false })
export class EnterpriseAccountLease {
  @Prop({ type: String })
  _id: string

  @Prop({ required: true })
  enterpriseId: string

  @Prop({ required: true })
  jobId: string

  @Prop({ required: true })
  executorId: string

  @Prop({ required: true })
  attemptId: string

  @Prop({ required: true })
  tokenHash: string

  @Prop({ required: true, type: Date })
  expiresAt: Date
}
export const EnterpriseAccountLeaseSchema = SchemaFactory.createForClass(EnterpriseAccountLease)
