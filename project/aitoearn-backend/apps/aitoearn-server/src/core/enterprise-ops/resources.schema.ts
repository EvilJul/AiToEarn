import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

import { EnterpriseResourceKind } from './enterprise.enums'

@Schema({ collection: 'enterpriseResourceBindings', timestamps: true, versionKey: false })
export class EnterpriseResourceBinding {
  _id: string

  @Prop({ required: true, immutable: true })
  enterpriseId: string

  @Prop({ required: true, enum: EnterpriseResourceKind, immutable: true })
  kind: EnterpriseResourceKind

  @Prop({ required: true, immutable: true })
  resourceId: string

  @Prop({ required: true, immutable: true })
  ownerUserId: string

  @Prop({ default: true })
  active: boolean
}

export const EnterpriseResourceBindingSchema = SchemaFactory.createForClass(EnterpriseResourceBinding)
EnterpriseResourceBindingSchema.index({ enterpriseId: 1, kind: 1, resourceId: 1 }, { unique: true })
