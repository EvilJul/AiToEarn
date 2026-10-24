'use client'
import type { EnterpriseGeneration } from '@/api/enterprise/enterprise.types'
import { useEffect, useRef, useState } from 'react'
import { createEnterpriseGeneration, getEnterpriseGeneration } from '@/api/enterprise/enterprise.api'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '../../store/editorStore'
import { requireSuccess } from '../../store/workspace.actions'
import { useWorkspaceStore } from '../../store/workspaceStore'

export function GenerationPanel({ disabled }: { disabled: boolean }) {
  const { t } = useTransClient('enterprise')
  const [job, setJob] = useState<EnterpriseGeneration | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const knowledgeIds = useEditorStore(s => s.knowledgeIds)
  async function generate() {
    const context = useWorkspaceStore.getState()
    const valid = () => alive.current && context.enterpriseId === useWorkspaceStore.getState().enterpriseId && context.sessionToken === useWorkspaceStore.getState().sessionToken
    setBusy(true); setError('')
    try {
      const draft = useEditorStore.getState()
      const created = requireSuccess(await createEnterpriseGeneration(context.enterpriseId, { requestId: crypto.randomUUID(), knowledgeIds: draft.knowledgeIds, topicId: draft.topicId || undefined, retryOf: job && ['failed', 'unknown'].includes(job.status) ? job.id : undefined }))
      if (valid())
        setJob(created)
      // Durable task remains in the usage list after this editor closes.
      for (let attempt = 0; attempt < 45 && valid(); attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        if (!valid())
          return
        const current = requireSuccess(await getEnterpriseGeneration(context.enterpriseId, created.id))
        if (!valid())
          return
        setJob(current)
        if (!['queued', 'running'].includes(current.status))
          return
      }
    }
    catch {
      if (valid())
        setError(t('generationError'))
    }
    finally {
      if (valid())
        setBusy(false)
    }
  }
  return (
    <section className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-sm font-medium">{t('generationTitle')}</p>
      <p className="text-xs leading-6 text-muted-foreground">{t('generationHelp')}</p>
      <Button type="button" variant="outline" disabled={disabled || busy || !knowledgeIds.length} onClick={generate}>{busy ? t('generating') : t('generateFromKnowledge')}</Button>
      {job && (
        <p className="text-xs text-muted-foreground">
          {t('generationTask')}
          :
          {' '}
          {job.id}
          {' '}
          ·
          {' '}
          {t(`generationStatus.${job.status}`)}
        </p>
      )}
      {job?.draft && (
        <div className="space-y-2">
          <p className="text-sm">{job.draft.title}</p>
          <p className="whitespace-pre-wrap text-sm leading-6">{job.draft.body}</p>
          <p className="text-xs text-muted-foreground">
            {t('generationLayout')}
            :
            {' '}
            {t(`templateKindName.${job.draft.layout}`, { defaultValue: job.draft.layout })}
          </p>
          {!!job.draft.missingCategories.length && <p className="text-xs text-muted-foreground">{t('missingSourceHelp')}</p>}
          <Button type="button" variant="outline" disabled={disabled || busy} onClick={() => useEditorStore.getState().update({ generationId: job.id, knowledgeIds: job.knowledgeIds, topicId: job.topicId, title: job.draft!.title, body: job.draft!.body })}>{t('applyGeneration')}</Button>
        </div>
      )}
      {job && ['failed', 'unknown'].includes(job.status) && <p className="text-xs text-muted-foreground">{t('generationRetryHelp')}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  )
}
