import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { EnterpriseRole } from './enterprise.enums'

@Schema({ collection: 'enterprises', timestamps: true, versionKey: false })
export class Enterprise {
  _id: string
  createdAt: Date
  updatedAt: Date

  @Prop({ required: true })
  name: string

  @Prop({ required: true, index: true, immutable: true })
  ownerUserId: string

  @Prop({ default: '' })
  industry: string

  @Prop({ type: [String], default: [] })
  regions: string[]

  @Prop({ default: 'Asia/Shanghai' })
  timezone: string

  @Prop({ default: 5, min: 1, max: 1440 })
  responseReminderMinutes: number

  @Prop({ default: false })
  allowSelfReview: boolean

  @Prop({ default: true })
  enabled: boolean

  @Prop({ default: 0 })
  version: number
}
export const EnterpriseSchema = SchemaFactory.createForClass(Enterprise)

@Schema({ collection: 'enterpriseMemberships', timestamps: true, versionKey: false })
export class EnterpriseMembership {
  _id: string

  @Prop({ required: true, immutable: true })
  enterpriseId: string

  @Prop({ required: true, immutable: true })
  userId: string

  @Prop({ required: true, enum: EnterpriseRole })
  role: EnterpriseRole

  @Prop({ default: true })
  active: boolean

  @Prop({ default: 0 })
  version: number
}
export const EnterpriseMembershipSchema = SchemaFactory.createForClass(EnterpriseMembership)
EnterpriseMembershipSchema.index({ enterpriseId: 1, userId: 1 }, { unique: true })
EnterpriseMembershipSchema.index({ userId: 1, active: 1 })

@Schema({ collection: 'enterpriseAuditEvents', timestamps: true, versionKey: false })
export class EnterpriseAuditEvent {
  _id: string
  createdAt: Date

  @Prop({ required: true, index: true, immutable: true })
  enterpriseId: string

  @Prop({ required: true, immutable: true })
  actorId: string

  @Prop({ required: true, immutable: true })
  action: string

  @Prop({ required: true, immutable: true })
  resourceId: string

  @Prop({ default: '' })
  reason: string
}
export const EnterpriseAuditEventSchema = SchemaFactory.createForClass(EnterpriseAuditEvent)
EnterpriseAuditEventSchema.index({ enterpriseId: 1, createdAt: -1 })
