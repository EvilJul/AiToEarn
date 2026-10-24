'use client'

/** PhotoUploadButton - 复用上传管线，保留资源 ID 并隔离企业/登录切换。 */
import type { ImageAsset } from '@/api/enterprise/enterprise.types'
import { Loader2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { uploadToOss } from '@/api/materials/material.api'
import { PlatType } from '@/app/config/platConfig'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePlatformInfo } from '@/hooks/usePlatformMetadata'
import { isMediaFileFormatAllowed } from '@/utils/media'
import { useWorkspaceStore } from '../../store/workspaceStore'

export function PhotoUploadButton({ remainingSlots, onUploaded }: { remainingSlots: number, onUploaded: (assets: ImageAsset[]) => void }) {
  const { t } = useTransClient('enterprise')
  const platform = usePlatformInfo(PlatType.Xhs)
  const configured = platform?.mediaRules.imageFormats
  const declared = Array.isArray(configured) ? configured.filter((format): format is string => typeof format === 'string') : []
  const formats = declared.length ? declared : ['jpg', 'jpeg', 'png', 'webp', 'bmp']
  const mediaUploadBusy = useWorkspaceStore(s => s.mediaUploadBusy)
  const input = useRef<HTMLInputElement>(null)
  const abort = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => () => abort.current?.abort(), [])
  return (
    <div className="space-y-2">
      <Input
        ref={input}
        className="hidden"
        type="file"
        multiple
        accept={formats.map(format => `.${format}`).join(',')}
        aria-label={t('uploadPhotos')}
        onChange={async (event) => {
          const files = Array.from(event.target.files || [])
          if (!files.length || useWorkspaceStore.getState().mediaUploadBusy)
            return
          if (files.length > remainingSlots) { setError(t('photoLimitHelp')); return }
          if (files.some(file => !isMediaFileFormatAllowed(file, formats))) { setError(t('photoFormatHelp')); return }
          const snapshot = useWorkspaceStore.getState()
          const identity = { enterpriseId: snapshot.enterpriseId, token: snapshot.sessionToken }
          const operation = Symbol('enterprise-photo-upload')
          const controller = new AbortController()
          abort.current = controller
          snapshot.setMediaUpload(operation, true)
          setBusy(true)
          setError('')
          try {
            for (const file of files) {
              const result: { asset?: { id: string, url: string } } = {}
              await uploadToOss(file, { signal: controller.signal, onUploaded: (asset) => { result.asset = asset } })
              if (!result.asset)
                throw new Error('Missing confirmed asset')
              const current = useWorkspaceStore.getState()
              if (controller.signal.aborted || current.enterpriseId !== identity.enterpriseId || current.sessionToken !== identity.token)
                return
              const uploaded = [{ ...result.asset, filename: file.name }]
              current.setData({ ...current.data, images: [...uploaded, ...current.data.images] })
              if (current.form)
                current.openForm({ ...current.form, fields: current.form.fields.map(field => field.type === 'assets' ? { ...field, options: [...uploaded.map(asset => ({ value: asset.id, label: asset.filename, imageUrl: asset.url })), ...(field.options || [])] } : field) })
              onUploaded(uploaded)
            }
          }
          catch {
            if (!controller.signal.aborted)
              setError(t('photoUploadError'))
          }
          finally {
            const current = useWorkspaceStore.getState()
            if (current.mediaUploadOperation === operation)
              current.setMediaUpload(null, false)
            setBusy(false)
            if (input.current)
              input.current.value = ''
          }
        }}
      />
      <Button type="button" variant="outline" disabled={mediaUploadBusy || busy || remainingSlots <= 0} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {t('uploadPhotos')}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
