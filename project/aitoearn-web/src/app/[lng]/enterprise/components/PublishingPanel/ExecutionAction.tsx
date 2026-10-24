'use client'

/** ExecutionAction - 领取服务端任务与设备租约；自动提交保持关闭。 */

import type { EnterpriseExecutor, EnterprisePublishJob } from '@/api/enterprise/enterprise.types'
import { useState } from 'react'
import { claimEnterprisePublishJob, getEnterprisePublishJobs, renewEnterpriseLease, reportEnterpriseExecutorEvent } from '@/api/enterprise/enterprise.api'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { canPrepareBrowserExecution, connectApprovedPublishJob, interpretExecuteResult } from '@/store/plugin/enterpriseExecution'
import { recordAction, requireSuccess, runAction } from '../../store/workspace.actions'
import { useWorkspaceStore } from '../../store/workspaceStore'

/** 刷新会卸下发布面板，进度和展示结论保存在组件外，避免服务端未知被刷新清掉。 */
const executionFeedback = new Map<string, { displayed: string, progress: number | null, leaseExpiresAt: string | null }>()

const messageKey = {
  unknown: 'executionUnknownCaution',
  awaiting_confirmation: 'executionAwaiting',
  submitted: 'executionSubmitted',
  in_progress: 'executionProgress',
  failed: 'executionFailed',
  cancelled: 'executionCancelled',
  published: 'executionPublished',
  submitting: 'executionAwaiting',
  scheduled: 'executionAwaiting',
  waiting_executor: 'executionAwaiting',
  blocked: 'executionFailed',
} as const

export function ExecutionAction({ enterpriseId, timezone, job, executor, approvalReady }: { enterpriseId: string, timezone: string, job: EnterprisePublishJob, executor: EnterpriseExecutor | null, approvalReady: boolean }) {
  const { t, i18n } = useTransClient('enterprise')
  const busy = useWorkspaceStore(s => s.busyAction)
  const images = useWorkspaceStore(s => s.data.images)
  const revisions = useWorkspaceStore(s => s.data.revisions)
  const cached = executionFeedback.get(job.id)
  const [progress, setProgress] = useState<number | null>(cached?.progress ?? null)
  const [note, setNote] = useState<{ displayed: string, leaseExpiresAt: string | null } | null>(cached ? { displayed: cached.displayed, leaseExpiresAt: cached.leaseExpiresAt } : null)
  const leaseActive = !!job.leaseExpiresAt && new Date(job.leaseExpiresAt).getTime() > Date.now()
  const canPrepare = canPrepareBrowserExecution({ supportsApprovalProtocol: approvalReady, jobMode: job.mode, accountId: job.accountId, executor }) && (['scheduled', 'waiting_executor'].includes(job.status) || (job.status === 'awaiting_confirmation' && !leaseActive))
  const lease = note?.leaseExpiresAt || job.leaseExpiresAt
  const displayed = note?.displayed
  const message = displayed ? messageKey[displayed as keyof typeof messageKey] : undefined
  return (
    <>
      {lease && <p>{t('executionLease', { time: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(lease)) })}</p>}
      {progress != null && <p>{t('executionProgress', { progress })}</p>}
      {message && <p role="status">{t(message, { progress: progress ?? 0 })}</p>}
      {canPrepare && executor && (
        <Button
          variant="outline"
          loading={busy === `execute-${job.id}`}
          disabled={!!busy}
          onClick={() => runAction(`execute-${job.id}`, async () => {
            const revision = revisions.find(item => item.id === job.revisionId)
            const mediaUrls = (revision?.imageAssetIds || []).flatMap((id) => {
              const image = images.find(item => item.id === id)
              return image?.url && /^https?:\/\//.test(image.url) ? [{ name: image.filename || id, url: image.url }] : []
            })
            const result = await connectApprovedPublishJob({
              supportsApprovalProtocol: true,
              job,
              executor,
              mediaUrls,
              claim: async (executorId) => requireSuccess(await claimEnterprisePublishJob(enterpriseId, job.id, executorId)),
              renew: async leaseInput => requireSuccess(await renewEnterpriseLease(enterpriseId, job.id, leaseInput)),
              cancel: async () => {
                const current = requireSuccess(await getEnterprisePublishJobs(enterpriseId)).find(item => item.id === job.id)
                await recordAction(`publish-jobs/${job.id}/cancel`, { expectedVersion: current?.version ?? job.version })
              },
              reportEvent: async (outcome, lease) => {
                const response = requireSuccess(await reportEnterpriseExecutorEvent(enterpriseId, job.id, { ...lease, eventId: crypto.randomUUID(), sequence: 1, outcome }))
                return response.status
              },
              readServerStatus: async () => requireSuccess(await getEnterprisePublishJobs(enterpriseId)).find(item => item.id === job.id)?.status || 'unknown',
              execute: async (payload, emit) => {
                const plugin = window.AiToEarnEnterpriseExtension
                if (!plugin?.executeApprovedTask)
                  throw new Error('enterprise plugin missing')
                return interpretExecuteResult(await plugin.executeApprovedTask({ ...payload, onSignal: emit }))
              },
              onSignal: (signal) => { if (signal.type === 'progress') setProgress(signal.progress) },
            })
            const feedback = { displayed: result.displayed, progress: result.progress, leaseExpiresAt: result.leaseExpiresAt }
            executionFeedback.set(job.id, feedback)
            setProgress(result.progress)
            setNote({ displayed: feedback.displayed, leaseExpiresAt: feedback.leaseExpiresAt })
            useWorkspaceStore.getState().refresh()
          })}
        >
          {t('prepareExecution')}
        </Button>
      )}
    </>
  )
}
