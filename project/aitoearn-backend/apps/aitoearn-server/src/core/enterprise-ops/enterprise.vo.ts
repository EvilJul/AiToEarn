import { createZodDto } from '@yikart/common'
import { z } from 'zod'
import { EnterpriseRole } from './enterprise.enums'

const EnterpriseVoSchema = z.object({
  id: z.string().describe('企业 ID'),
  name: z.string().describe('名称'),
  industry: z.string().describe('行业'),
  regions: z.array(z.string()).describe('服务区域'),
  timezone: z.string().describe('时区'),
  responseReminderMinutes: z.number().describe('无人接管提醒分钟数'),
  allowSelfReview: z.boolean().describe('允许作者自审'),
  enabled: z.boolean().describe('启用状态'),
  version: z.number().describe('并发版本'),
  role: z.enum(EnterpriseRole).describe('当前成员角色'),
})
export class EnterpriseVo extends createZodDto(EnterpriseVoSchema, 'EnterpriseVo') {}

export class EnterpriseMembershipVo extends createZodDto(z.object({
  id: z.string().describe('成员 ID'),
  userId: z.string().describe('用户 ID'),
  role: z.enum(EnterpriseRole).describe('角色'),
  active: z.boolean().describe('启用状态'),
  version: z.number().describe('并发版本'),
}), 'EnterpriseMembershipVo') {}

export class EnterpriseAuditVo extends createZodDto(z.object({
  id: z.string().describe('审计事件 ID'),
  actorId: z.string().describe('操作者'),
  action: z.string().describe('业务动作'),
  resourceId: z.string().describe('资源 ID'),
  reason: z.string().describe('原因'),
  createdAt: z.coerce.date().describe('时间'),
}), 'EnterpriseAuditVo') {}
