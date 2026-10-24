import { createZodDto } from '@yikart/common'
import { z } from 'zod'
import { objectIdSchema } from './enterprise.dto'

export class RegisterEnterpriseExecutorDto extends createZodDto(z.object({
  deviceId: z.uuid().describe('设备标识'),
  accountId: z.string().min(1).max(200).describe('企业已授权小红书账号'),
  observedAccountUid: z.string().min(1).max(200).describe('设备当前登录小红书身份'),
  pluginVersion: z.string().regex(/^\d+\.\d+\.\d+$/).describe('扩展版本'),
  capabilities: z.array(z.enum(['image_text', 'approval_gate', 'manual_confirmation'])).max(3).describe('已实现的执行能力'),
}).strict(), 'RegisterEnterpriseExecutorDto') {}

export class ClaimEnterpriseJobDto extends createZodDto(z.object({
  executorId: objectIdSchema.describe('执行设备'),
}).strict(), 'ClaimEnterpriseJobDto') {}

export const EnterpriseLeaseSchema = z.object({
  executorId: objectIdSchema.describe('执行设备'),
  attemptId: z.uuid().describe('本次执行标识'),
  leaseToken: z.string().regex(/^[a-f\d]{64}$/).describe('短期执行凭证'),
}).strict()
export class EnterpriseLeaseDto extends createZodDto(EnterpriseLeaseSchema, 'EnterpriseLeaseDto') {}

export class EnterpriseExecutorEventDto extends createZodDto(EnterpriseLeaseSchema.extend({
  eventId: z.uuid().describe('回执唯一标识'),
  sequence: z.number().int().min(1).max(1000).describe('单次执行递增事件序号'),
  outcome: z.enum(['submitted', 'unknown', 'failed']).describe('提交结果；不允许插件直接宣称核验成功'),
  workLink: z.url().max(2000).optional().describe('已提交作品链接'),
}).strict(), 'EnterpriseExecutorEventDto') {}
