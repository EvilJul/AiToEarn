'use client'

import { Loader2 } from 'lucide-react'
/** BrandTemplateComposer - 三类确定性品牌模板，不编造价格或案例。 */
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { getEnterpriseImageSource } from '@/api/enterprise/enterprise.api'
import { uploadToOss } from '@/api/materials/material.api'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useEditorStore } from '../../store/editorStore'
import { useTemplateStore } from '../../store/templateStore'
import { requireSuccess } from '../../store/workspace.actions'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { BrandTemplateKind, renderBrandTemplate } from './utils/renderTemplate'

export function BrandTemplateComposer({ onClose }: { onClose: () => void }) {
  const { t } = useTransClient('enterprise')
  const { resolvedTheme } = useTheme()
  const workspace = useWorkspaceStore(useShallow(s => ({ enterpriseId: s.enterpriseId, enterprises: s.enterprises, knowledge: s.data.knowledge, sessionToken: s.sessionToken })))
  const state = useTemplateStore(useShallow(s => ({ kind: s.kind, knowledgeId: s.knowledgeId, title: s.title, body: s.body, busy: s.busy, error: s.error, update: s.update })))
  const imageIds = useEditorStore(s => s.imageIds)
  const sourceId = imageIds[0]
  const company = workspace.enterprises.find(e => e.id === workspace.enterpriseId)
  const preview = useRef<HTMLCanvasElement>(null)
  const abort = useRef<AbortController | null>(null)
  const [photo, setPhoto] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)
  useEffect(() => () => abort.current?.abort(), [])
  useEffect(() => {
    let active = true
    setPhoto('')
    setPhotoLoading(Boolean(sourceId && state.kind !== BrandTemplateKind.Faq))
    if (sourceId && state.kind !== BrandTemplateKind.Faq) {
      getEnterpriseImageSource(workspace.enterpriseId, sourceId).then((response) => {
        const image = requireSuccess(response)
        if (active)
          setPhoto(`data:${image.mimeType};base64,${image.base64}`)
      }).catch(() => {
        if (active)
          state.update({ error: t('templateError.TEMPLATE_INVALID_IMAGE') })
      }).finally(() => {
        if (active)
          setPhotoLoading(false)
      })
    }
    return () => { active = false }
  }, [sourceId, state.kind, workspace.enterpriseId])
  const render = () => renderBrandTemplate({ kind: state.kind, companyName: company?.name || '', title: state.title, body: state.body, photo: photo || undefined })
  useEffect(() => {
    let active = true
    if (!state.knowledgeId || (sourceId && state.kind !== BrandTemplateKind.Faq && !photo)) { preview.current?.getContext('2d')?.clearRect(0, 0, 1080, 1440); return }
    render().then((canvas) => {
      if (active && preview.current) { preview.current.width = canvas.width; preview.current.height = canvas.height; preview.current.getContext('2d')?.drawImage(canvas, 0, 0); state.update({ error: '' }) }
    }).catch((error) => {
      if (active)
        state.update({ error: t(`templateError.${error instanceof Error ? error.message : 'TEMPLATE_CANVAS_UNAVAILABLE'}`, { defaultValue: t('error') }) })
    })
    return () => { active = false }
  }, [state.kind, state.title, state.body, state.knowledgeId, photo, sourceId, company?.name, resolvedTheme])
  const knowledge = workspace.knowledge.filter(k => k.status === 'approved' && new Date(k.validUntil) > new Date() && (state.kind === BrandTemplateKind.Cover || k.category === state.kind))
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle>{t('brandTemplates')}</DialogTitle></DialogHeader>
        <form
          className="grid gap-6 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault()
            event.stopPropagation()
            if (useTemplateStore.getState().busy)
              return
            const operationId = Symbol('template-generation')
            state.update({ operationId, busy: true, error: '' })
            const controller = new AbortController()
            abort.current = controller
            const context = { enterpriseId: workspace.enterpriseId, token: workspace.sessionToken }
            try {
              if (useEditorStore.getState().imageIds.length >= 9)
                throw new Error('TEMPLATE_IMAGE_LIMIT')
              const canvas = await render()
              const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('TEMPLATE_CANVAS_UNAVAILABLE')), 'image/png'))
              const uploaded: { asset?: { id: string, url: string } } = {}
              await uploadToOss(new File([blob], `enterprise-${state.kind}-${Date.now()}.png`, { type: 'image/png' }), { signal: controller.signal, onUploaded: (asset) => { uploaded.asset = asset } })
              const current = useWorkspaceStore.getState()
              if (controller.signal.aborted || current.enterpriseId !== context.enterpriseId || current.sessionToken !== context.token || !uploaded.asset)
                throw new Error('TEMPLATE_CONTEXT_CHANGED')
              current.setData({ ...current.data, images: [{ id: uploaded.asset.id, url: uploaded.asset.url, filename: state.title }, ...current.data.images] })
              const draft = useEditorStore.getState()
              if (draft.imageIds.length >= 9)
                throw new Error('TEMPLATE_IMAGE_LIMIT')
              draft.update({ title: draft.title || (state.title.length <= 20 ? state.title : ''), body: draft.body || state.body, imageIds: [uploaded.asset.id, ...draft.imageIds], knowledgeIds: [...new Set([...draft.knowledgeIds, state.knowledgeId])] })
              onClose()
            }
            catch (error) {
              if (!controller.signal.aborted && useTemplateStore.getState().operationId === operationId)
                state.update({ error: error instanceof Error && error.message.startsWith('TEMPLATE_') ? t(`templateError.${error.message}`) : t('templateUploadError') })
            }
            finally {
              if (useTemplateStore.getState().operationId === operationId)
                state.update({ busy: false })
            }
          }}
        >
          <fieldset disabled={state.busy} className="min-w-0 space-y-4 border-0 p-0">
            <p className="text-sm leading-6 text-muted-foreground">{t('templateHelp')}</p>
            <div className="space-y-2">
              <Label>{t('templateKind')}</Label>
              <Select
                value={state.kind}
                onValueChange={(value) => {
                  const kind = Object.values(BrandTemplateKind).find(kind => kind === value); if (kind)
                    state.update({ kind, knowledgeId: '', title: '', body: '', error: '' })
                }}
              >
                <SelectTrigger aria-label={t('templateKind')}><SelectValue /></SelectTrigger>
                <SelectContent>{Object.values(BrandTemplateKind).map(kind => <SelectItem key={kind} value={kind}>{t(`templateKindName.${kind}`)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('fields.knowledge')}</Label>
              <Select
                value={state.knowledgeId}
                required
                onValueChange={(id) => {
                  const item = knowledge.find(k => k.id === id); if (item)
                    state.update({ knowledgeId: id, title: item.title, body: item.body, error: '' })
                }}
              >
                <SelectTrigger aria-label={t('templateKnowledge')}><SelectValue /></SelectTrigger>
                <SelectContent>{knowledge.map(k => <SelectItem key={k.id} value={k.id}>{k.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-title">{t('fields.title')}</Label>
              <Input id="template-title" maxLength={36} required value={state.title} onChange={e => state.update({ title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-body">{t('fields.body')}</Label>
              <Textarea id="template-body" maxLength={200} required value={state.body} onChange={e => state.update({ body: e.target.value })} />
              <p className="text-xs text-muted-foreground">{t('templateFactsHelp')}</p>
            </div>
            {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
            <Button disabled={state.busy || !state.knowledgeId || photoLoading || imageIds.length >= 9 || (Boolean(sourceId) && state.kind !== BrandTemplateKind.Faq && !photo) || (state.kind === BrandTemplateKind.Case && !photo)}>
              {state.busy && <Loader2 className="size-4 animate-spin" />}
              {t('useTemplateImage')}
            </Button>
          </fieldset>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{t('templatePreview')}</p>
            <canvas ref={preview} role="img" aria-label={t('templatePreview')} className="h-auto w-full rounded-lg border border-border" width={1080} height={1440} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
