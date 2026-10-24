'use client'

/** PublishingPanel - 已审任务、素材包、人工回填、设备租约与独立核验。自动提交保持关闭。 */

import type { Enterprise } from '@/api/enterprise/enterprise.types'
import { Download, Plus } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { getAccountListApi } from '@/api/accounts/account.api'
import { getEnterpriseMaterialPackage } from '@/api/enterprise/enterprise.api'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { inspectEnterprisePlugin } from '@/store/plugin/enterpriseAdapter'
import { canPrepareBrowserExecution, resolvePublishJobMode } from '@/store/plugin/enterpriseExecution'
import { createRecord, recordAction, requireSuccess, runAction } from '../../store/workspace.actions'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { PluginDiagnostics } from '../PluginDiagnostics'
import { EmptyRecords, RecordList, RecordRow } from '../RecordList'
import { ExecutionAction } from './ExecutionAction'

const PublishingCalendar = dynamic(() => import('../PublishingCalendar'), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> })

export function PublishingPanel({ enterprise }: { enterprise: Enterprise }) {
  const { t, i18n } = useTransClient('enterprise')
  const [calendar, setCalendar] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState('')
  const resources = useWorkspaceStore(s => s.data.resources)
  const executors = useWorkspaceStore(s => s.data.executors)
  const inspection = useWorkspaceStore(s => s.pluginInspection)
  const preferred = useWorkspaceStore(s => s.preferredPluginSource)
  const queueFilter = useWorkspaceStore(s => s.queueFilter)
  const allRecords = useWorkspaceStore(s => s.data.jobs)
  const approvalReady = inspection?.supportsApprovalProtocol === true && inspection.status === 'ready'
  // 打开发布页时检查扩展是否声明审核协议；检查失败时保持人工路径。
  useEffect(() => {
    let active = true
    inspectEnterprisePlugin(preferred).then((result) => {
      if (active)
        useWorkspaceStore.getState().setPluginInspection(result)
    }).catch(() => {})
    return () => { active = false }
  }, [preferred])
  const records = queueFilter === 'open' ? allRecords.filter(record => !['published', 'cancelled'].includes(record.status)) : allRecords
  const revisions = useWorkspaceStore(s => s.data.revisions)
  const openForm = useWorkspaceStore(s => s.openForm)
  const busy = useWorkspaceStore(s => s.busyAction)
  const canWrite = ['admin', 'operator'].includes(enterprise.role)
  const canVerify = ['admin', 'reviewer'].includes(enterprise.role)
  return (
    <section className="space-y-5">
      <PluginDiagnostics compact />
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm leading-6">
        <p>{t('manualPublishHelp')}</p>
        <p>{approvalReady ? t('executionProtocolHelp') : t('executionManualOnly')}</p>
      </div>
      <div className="flex justify-end">
        {canWrite && (
          <Button
            disabled={!!busy}
            onClick={() => runAction('create-job', async () => {
              const accounts = requireSuccess(await getAccountListApi()).list.filter(account => account.type === 'xhs')
              openForm({ title: t('addJob'), fields: [{ name: 'revisionId', label: t('fields.approvedContent'), type: 'select', options: revisions.filter(r => r.status === 'approved').map(r => ({ value: r.id, label: `${r.title} · ${t('revisionNumber')} ${r.revisionNumber}` })) }, { name: 'accountId', label: t('fields.account'), type: 'select', options: [...new Map([...resources.filter(resource => resource.kind === 'account').map(resource => ({ value: resource.resourceId, label: resource.name })), ...accounts.map(account => ({ value: account.id, label: account.nickname }))].map(option => [option.value, option])).values()] }, { name: 'scheduledAt', label: t('fields.scheduledAt'), type: 'datetime-local' }, ...(approvalReady ? [{ name: 'mode', label: t('fields.executionMode'), type: 'select' as const, defaultValue: 'manual', options: [{ value: 'manual', label: t('status.manual') }, { value: 'browser', label: t('status.browser') }] }] : [])], submit: values => createRecord('publish-jobs', { ...values, scheduledAt: new Date(values.scheduledAt).toISOString(), mode: resolvePublishJobMode(approvalReady, values.mode) }) })
            })}
          >
            <Plus className="mr-2 size-4" />
            {t('addJob')}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={calendar ? 'outline' : 'secondary'} onClick={() => { setCalendar(false); setSelectedJobId('') }}>{t('listView')}</Button>
        <Button variant={calendar ? 'secondary' : 'outline'} onClick={() => setCalendar(true)}>{t('calendarView')}</Button>
        {selectedJobId && <Button variant="ghost" onClick={() => setSelectedJobId('')}>{t('showAllJobs')}</Button>}
      </div>
      {calendar && <PublishingCalendar jobs={records} revisions={revisions} timezone={enterprise.timezone} onSelect={(id) => { setSelectedJobId(id); setCalendar(false) }} />}
      {!records.length ? <EmptyRecords /> : (
        <RecordList>
          {records.filter(record => !selectedJobId || record.id === selectedJobId).map(record => (
            <RecordRow
              key={record.id}
              title={revisions.find(r => r.id === record.revisionId)?.title || t('approvedVersion')}
              status={record.status}
              detail={(
                <>
                  {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short', timeZone: enterprise.timezone }).format(new Date(record.scheduledAt))}
                  {' '}
                  ·
                  {' '}
                  {enterprise.timezone}
                  <p>{resources.find(resource => resource.kind === 'account' && resource.resourceId === record.accountId)?.name || t('accountUnavailable')}</p>
                  <p>
                    {record.overdue && <span className="mr-2 text-destructive">{t('overdue')}</span>}
                    {t(`status.${record.mode}`)}
                    {record.verificationMethod === 'manual' && ` · ${t('manualVerified')}`}
                  </p>
                  {record.workLink && <a href={record.workLink} target="_blank" rel="noreferrer" className="text-brand-ink underline underline-offset-4">{t('viewWork')}</a>}
                </>
              )}
            >
              {(canWrite || canVerify) && (
                <Button
                  variant="outline"
                  disabled={!!busy}
                  onClick={() => runAction(record.id, async () => {
                    const pack = requireSuccess(await getEnterpriseMaterialPackage(enterprise.id, record.id))
                    const { default: JSZip } = await import('jszip')
                    const { default: saveAs } = await import('file-saver')
                    const zip = new JSZip()
                    zip.file('title.txt', pack.title)
                    zip.file('content.txt', pack.body)
                    zip.file('topics.txt', pack.topics.map(topic => `#${topic}`).join(' '))
                    zip.file('approval.json', JSON.stringify({ revisionId: pack.revisionId, contentHash: pack.contentHash, review: pack.review }, null, 2))
                    zip.file('README.txt', t('packageHelp'))
                    for (const file of pack.files) zip.file(file.name, file.base64, { base64: true })
                    saveAs(await zip.generateAsync({ type: 'blob' }), `xiaohongshu-${record.id}.zip`)
                  })}
                >
                  <Download className="mr-2 size-4" />
                  {t('downloadPackage')}
                </Button>
              )}
              {canWrite && (record.status === 'awaiting_confirmation' || record.status === 'unknown' || (record.status === 'submitted' && !record.workLink)) && <Button disabled={!!busy} onClick={() => openForm({ title: t('recordResult'), fields: [{ name: 'workLink', label: t('fields.workLink') }], submit: values => recordAction(`publish-jobs/${record.id}/manual-result`, { ...values, expectedVersion: record.version }) })}>{t('recordResult')}</Button>}
              {canVerify && record.status === 'submitted' && <Button disabled={!!busy} onClick={() => openForm({ title: t('verifyResult'), fields: [{ name: 'evidence', label: t('fields.evidence'), type: 'textarea' }], submit: values => recordAction(`publish-jobs/${record.id}/verify`, { ...values, expectedVersion: record.version }) })}>{t('verifyResult')}</Button>}
              {canWrite && record.status === 'published' && <Button variant="outline" onClick={() => { const requestId = crypto.randomUUID(); openForm({ title: t('republish'), fields: [{ name: 'scheduledAt', label: t('fields.scheduledAt'), type: 'datetime-local' }], submit: values => recordAction(`publish-jobs/${record.id}/republish`, { expectedVersion: record.version, requestId, scheduledAt: new Date(values.scheduledAt).toISOString() }) }) }}>{t('republish')}</Button>}
              {canWrite && record.status === 'awaiting_confirmation' && <Button variant="outline" disabled={!!busy} onClick={() => runAction(record.id, () => recordAction(`publish-jobs/${record.id}/cancel`, { expectedVersion: record.version }))}>{t('cancel')}</Button>}
              {canWrite && <ExecutionAction enterpriseId={enterprise.id} timezone={enterprise.timezone} job={record} approvalReady={approvalReady} executor={executors.find(executor => canPrepareBrowserExecution({ supportsApprovalProtocol: approvalReady, jobMode: record.mode, accountId: record.accountId, executor })) || null} />}
            </RecordRow>
          ))}
        </RecordList>
      )}
    </section>
  )
}
