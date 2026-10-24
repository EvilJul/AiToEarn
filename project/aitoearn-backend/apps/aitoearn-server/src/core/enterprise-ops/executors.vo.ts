import { createZodDto } from '@yikart/common'
import { z } from 'zod'
import { MaterialPackageVo } from './operations.vo'

export class EnterpriseExecutorVo extends createZodDto(z.object({ id: z.string().describe('设备绑定 ID'), deviceId: z.string().describe('设备标识'), accountId: z.string().describe('账号'), pluginVersion: z.string().describe('扩展版本'), capabilities: z.array(z.string()).describe('能力'), lastHeartbeatAt: z.coerce.date().describe('最后心跳'), revoked: z.boolean().describe('已撤销'), online: z.boolean().describe('在线状态') }), 'EnterpriseExecutorVo') {}
export class EnterpriseExecutorIdVo extends createZodDto(z.object({ id: z.string().describe('设备绑定 ID') }), 'EnterpriseExecutorIdVo') {}
export class EnterpriseExecutorClaimVo extends createZodDto(z.object({ jobId: z.string().describe('任务 ID'), attemptId: z.string().describe('执行尝试 ID'), leaseToken: z.string().describe('短期凭证，仅返回给领取者'), expiresAt: z.coerce.date().describe('有效期'), payload: MaterialPackageVo.schema.describe('已审且核验过图片内容的执行负载') }), 'EnterpriseExecutorClaimVo') {}
export class EnterpriseSubmitAuthorizationVo extends createZodDto(z.object({ jobId: z.string().describe('任务 ID'), attemptId: z.string().describe('执行尝试'), accountId: z.string().describe('绑定账号'), contentHash: z.string().describe('批准内容摘要'), expiresAt: z.coerce.date().describe('授权到期时间') }), 'EnterpriseSubmitAuthorizationVo') {}
export class EnterpriseLeaseExpiryVo extends createZodDto(z.object({ expiresAt: z.coerce.date().describe('租约到期时间') }), 'EnterpriseLeaseExpiryVo') {}
export class EnterpriseExecutorResultVo extends createZodDto(z.object({ jobId: z.string().describe('任务 ID'), status: z.string().describe('结果状态，提交成功不等于发布核验成功') }), 'EnterpriseExecutorResultVo') {}
