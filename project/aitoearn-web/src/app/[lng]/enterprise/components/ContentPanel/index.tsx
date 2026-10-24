'use client'

/** ContentPanel - 审核列表、真实素材编辑和笔记预览。 */

import type { Enterprise } from '@/api/enterprise/enterprise.types'
import { FilePlus2, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { PlatType } from '@/app/config/platConfig'
import { useTransClient } from '@/app/i18n/client'
import { OssImage } from '@/components/common/OssImage'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { usePlatformInfo } from '@/hooks/usePlatformMetadata'
import { useEditorStore } from '../../store/editorStore'
import { useTemplateStore } from '../../store/templateStore'
import { createRecord, recordAction, runAction } from '../../store/workspace.actions'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { AssetPicker } from '../AssetPicker'
import { BrandTemplateComposer } from '../BrandTemplateComposer'
import { GenerationPanel } from '../GenerationPanel'
import { PhotoUploadButton } from '../PhotoUploadButton'
import { EmptyRecords, RecordList, RecordRow } from '../RecordList'
import { RevisionEvidence } from '../RevisionEvidence'
import { RevisionHistory } from '../RevisionHistory'

function ContentEditor({ onClose }: { onClose: () => void }) {
  const [templateOpen, setTemplateOpen] = useState(false)
  const mediaUploadBusy = useWorkspaceStore(s => s.mediaUploadBusy)
  const platform = usePlatformInfo(PlatType.Xhs)
  const { t } = useTransClient('enterprise')
  const { knowledge, images } = useWorkspaceStore(useShallow(s => ({ knowledge: s.data.knowledge, images: s.data.images })))
  const draft = useEditorStore(useShallow(s => ({ generationId: s.generationId, title: s.title, body: s.body, topics: s.topics, knowledgeIds: s.knowledgeIds, sourceRevisionId: s.sourceRevisionId, topicId: s.topicId, imageIds: s.imageIds, saving: s.saving, error: s.error, update: s.update })))
  return (
    <Dialog open onOpenChange={open => !open && !draft.saving && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-5xl overflow-y-auto">
        <DialogHeader><DialogTitle>{t('addContent')}</DialogTitle></DialogHeader>
        <form onSubmit={async (e) => {
          e.preventDefault()
          draft.update({ saving: true, error: '' })
          try {
            await createRecord('revisions', { generationId: draft.generationId || undefined, title: draft.title, body: draft.body, topics: draft.topics.split(',').map(v => v.trim()).filter(Boolean), knowledgeIds: draft.knowledgeIds, sourceRevisionId: draft.sourceRevisionId || undefined, topicId: draft.topicId || undefined, imageAssetIds: draft.imageIds })
            onClose()
          }
          catch (failure) { draft.update({ error: failure instanceof Error ? failure.message : t('error') }) }
          finally { draft.update({ saving: false }) }
        }}
        >
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="note-title">{t('fields.title')}</Label>
                <Input id="note-title" required maxLength={platform?.contentLimits.maxTitleLength} value={draft.title} onChange={e => draft.update({ title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note-body">{t('fields.body')}</Label>
                <Textarea id="note-body" required maxLength={platform?.contentLimits.maxBodyLength} rows={7} value={draft.body} onChange={e => draft.update({ body: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note-topics">{t('fields.keywords')}</Label>
                <Input id="note-topics" value={draft.topics} onChange={e => draft.update({ topics: e.target.value })} />
              </div>
              <div className="space-y-2">
                <p id="note-knowledge-label" className="text-sm font-medium">{t('fields.knowledge')}</p>
                <div role="group" aria-labelledby="note-knowledge-label" className="max-h-48 space-y-3 overflow-y-auto rounded-md border border-border p-3">
                  {knowledge.filter(k => k.status === 'approved' && new Date(k.validUntil) > new Date()).map(k => (
                    <label className="flex cursor-pointer items-start gap-3 text-sm" key={k.id}>
                      <Checkbox checked={draft.knowledgeIds.includes(k.id)} onCheckedChange={checked => draft.update({ knowledgeIds: checked === true ? [...draft.knowledgeIds, k.id] : draft.knowledgeIds.filter(id => id !== k.id) })} />
                      <span>{k.title}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{t('knowledgeRequired')}</p>
              </div>
              <GenerationPanel disabled={mediaUploadBusy || draft.saving} />
              <div className="space-y-3">
                <Label>{t('fields.images')}</Label>
                <p className="text-xs text-muted-foreground">{t('assetSharingHelp')}</p>
                <PhotoUploadButton remainingSlots={(platform?.contentLimits.maxImages || 9) - draft.imageIds.length} onUploaded={assets => draft.update({ imageIds: [...useEditorStore.getState().imageIds, ...assets.map(asset => asset.id)] })} />
                <Button type="button" disabled={mediaUploadBusy || draft.saving} variant="outline" onClick={() => { useTemplateStore.getState().reset(); setTemplateOpen(true) }}>{t('brandTemplates')}</Button>
                {!images.length ? <p className="text-sm text-muted-foreground">{t('imagesRequired')}</p> : (
                  <AssetPicker disabled={mediaUploadBusy} images={images} selected={draft.imageIds} maxCount={platform?.contentLimits.maxImages} onChange={imageIds => draft.update({ imageIds })} />
                )}
              </div>
            </div>
            <aside className="rounded-lg border border-border bg-muted/30 p-5">
              <p className="mb-4 text-xs font-medium text-muted-foreground">{t('notePreview')}</p>
              {draft.imageIds[0] && images.find(image => image.id === draft.imageIds[0]) && <div className="relative mb-5 aspect-[3/4] overflow-hidden rounded-lg"><OssImage src={images.find(image => image.id === draft.imageIds[0])!.url} fill sizes="360px" disableOssThumbnail alt={t('notePreview')} className="object-cover" /></div>}
              <h3 className="break-words text-lg font-semibold">{draft.title || t('previewTitle')}</h3>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{draft.body || t('previewBody')}</p>
              <p className="mt-4 break-words text-sm text-brand-ink">{draft.topics.split(',').filter(Boolean).map(topic => `#${topic.trim()}`).join(' ')}</p>
              <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">{t('previewHelp')}</p>
            </aside>
          </div>
          {draft.error && <p role="alert" className="mt-4 text-sm text-destructive">{draft.error}</p>}
          <div className="mt-6 flex justify-end">
            <Button disabled={mediaUploadBusy || draft.saving || draft.knowledgeIds.length === 0}>
              {draft.saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('saveDraft')}
            </Button>
          </div>
        </form>
        {templateOpen && <BrandTemplateComposer onClose={() => setTemplateOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

export function ContentPanel({ enterprise }: { enterprise: Enterprise }) {
  const { t } = useTransClient('enterprise')
  const queueFilter = useWorkspaceStore(s => s.queueFilter)
  const allRecords = useWorkspaceStore(s => s.data.revisions)
  const records = queueFilter === 'pending_review' ? allRecords.filter(record => record.status === 'pending_review') : allRecords
  const openForm = useWorkspaceStore(s => s.openForm)
  const busy = useWorkspaceStore(s => s.busyAction)
  const [editor, setEditor] = useState(false)
  const topicId = useEditorStore(s => s.topicId)
  useEffect(() => {
    if (topicId)
      setEditor(true)
  }, [topicId])
  const canWrite = ['admin', 'operator'].includes(enterprise.role)
  const canReview = ['admin', 'reviewer'].includes(enterprise.role)
  return (
    <section className="space-y-5">
      <div className="flex justify-end">
        {canWrite && (
          <Button onClick={() => { useEditorStore.getState().reset(); setEditor(true) }}>
            <FilePlus2 className="mr-2 size-4" />
            {t('addContent')}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t('reviewHelp')}</p>
      {!records.length ? <EmptyRecords /> : (
        <RecordList>
          {records.map(record => (
            <RecordRow
              key={record.id}
              stacked
              title={record.title}
              status={record.status}
              detail={(
                <>
                  <p>
                    {t('revisionNumber')}
                    :
                    {' '}
                    {record.revisionNumber}
                  </p>
                  {record.body}
                  <p className="mt-2 text-brand-ink">{record.topics.map(topic => `#${topic}`).join(' ')}</p>
                  {record.reviewReason && <p>{record.reviewReason}</p>}
                  <RevisionEvidence enterpriseId={enterprise.id} knowledgeIds={record.knowledgeIds} />
                </>
              )}
            >
              <RevisionHistory revision={record} enterpriseId={enterprise.id} timezone={enterprise.timezone} />
              {canWrite && <Button variant="outline" onClick={() => { const data = useWorkspaceStore.getState().data; useEditorStore.getState().reset(); useEditorStore.getState().update({ title: record.title, body: record.body, topics: record.topics.join(','), sourceRevisionId: record.id, knowledgeIds: record.knowledgeIds.filter(id => data.knowledge.some(k => k.id === id && k.status === 'approved' && new Date(k.validUntil) > new Date())), imageIds: record.imageAssetIds.filter(id => data.images.some(image => image.id === id)) }); setEditor(true) }}>{t('createRevision')}</Button>}
              {canWrite && ['draft', 'rejected'].includes(record.status) && <Button variant="outline" disabled={!!busy} onClick={() => runAction(record.id, () => recordAction(`revisions/${record.id}/submit-review`, { expectedVersion: record.version }))}>{t('submitReview')}</Button>}
              {canReview && record.status === 'pending_review' && (
                <>
                  <Button disabled={!!busy} onClick={() => runAction(record.id, () => recordAction(`revisions/${record.id}/review`, { expectedVersion: record.version, decision: 'approved' }))}>{t('approve')}</Button>
                  <Button variant="outline" onClick={() => openForm({ title: t('reject'), fields: [{ name: 'reason', label: t('fields.reason'), type: 'textarea' }], submit: values => recordAction(`revisions/${record.id}/review`, { ...values, expectedVersion: record.version, decision: 'rejected' }) })}>{t('reject')}</Button>
                </>
              )}
            </RecordRow>
          ))}
        </RecordList>
      )}
      {editor && <ContentEditor onClose={() => { useEditorStore.getState().update({ topicId: '' }); setEditor(false) }} />}
    </section>
  )
}
