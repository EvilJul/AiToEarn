import { createZodDto } from '@yikart/common'
import { z } from 'zod'
import { EnterpriseRole } from './enterprise.enums'

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i).describe('对象 ID')
const timezoneSchema = z.string().min(1).max(100).refine((value) => {
  try {
    return Boolean(Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone)
  }
  catch { return false }
}, 'Invalid IANA timezone').describe('IANA 企业时区')

export const EnterpriseSettingsSchema = z.object({
  name: z.string().trim().min(1).max(100).describe('企业名称'),
  industry: z.string().trim().max(100).default('').describe('行业'),
  regions: z.array(z.string().trim().min(1).max(100)).max(50).default([]).describe('服务区域'),
  responseReminderMinutes: z.number().int().min(1).max(1440).default(5).describe('无人接管提醒时限（分钟）'),
  timezone: timezoneSchema.default('Asia/Shanghai').describe('企业时区'),
}).strict()
export class CreateEnterpriseDto extends createZodDto(EnterpriseSettingsSchema, 'CreateEnterpriseDto') {}

export class UpdateEnterpriseDto extends createZodDto(EnterpriseSettingsSchema.extend({
  expectedVersion: z.number().int().nonnegative().describe('预期版本'),
  allowSelfReview: z.boolean().describe('允许内容作者自审'),
  enabled: z.boolean().describe('是否启用企业模式'),
}), 'UpdateEnterpriseDto') {}

export class CreateMembershipDto extends createZodDto(z.object({
  userId: objectIdSchema.describe('已有用户 ID'),
  role: z.enum(EnterpriseRole).describe('成员角色'),
}).strict(), 'CreateMembershipDto') {}

export class UpdateMembershipDto extends createZodDto(z.object({
  expectedVersion: z.number().int().nonnegative().describe('预期版本'),
  role: z.enum(EnterpriseRole).describe('成员角色'),
  active: z.boolean().describe('成员启用状态'),
}).strict(), 'UpdateMembershipDto') {}

export class EnterprisePaginationDto extends createZodDto(z.object({
  page: z.coerce.number().int().min(1).default(1).describe('页码'),
  pageSize: z.coerce.number().int().min(1).max(100).default(20).describe('每页数量'),
}), 'EnterprisePaginationDto') {}
