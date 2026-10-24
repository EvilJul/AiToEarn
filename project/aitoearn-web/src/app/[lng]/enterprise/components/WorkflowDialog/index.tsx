'use client'

/** WorkflowDialog - 企业业务操作表单，保留字段、错误和提交状态。 */

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { AssetPicker } from '../AssetPicker'
import { PhotoUploadButton } from '../PhotoUploadButton'

export function WorkflowDialog() {
  const { form, closeForm } = useWorkspaceStore(useShallow(s => ({ form: s.form, closeForm: s.closeForm })))
  const { t } = useTransClient('enterprise')
  const mediaUploadBusy = useWorkspaceStore(s => s.mediaUploadBusy)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  if (!form)
    return null
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) { closeForm(); setError(''); setValues({}) } }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{form.title}</DialogTitle></DialogHeader>
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            setError('')
            const payload = Object.fromEntries(form.fields.map(field => [field.name, values[field.name] ?? field.defaultValue ?? '']))
            try { await form.submit(payload); closeForm(); setValues({}) }
            catch (failure) { setError(failure instanceof Error ? failure.message : t('error')) }
            finally { setBusy(false) }
          }}
        >
          {form.fields.map(field => (
            <div className="space-y-2" key={field.name}>
              <Label htmlFor={`enterprise-${field.name}`}>{field.label}</Label>
              {field.type === 'assets'
                ? (
                    <>
                      <PhotoUploadButton remainingSlots={9 - (values[field.name] || field.defaultValue || '').split(',').filter(Boolean).length} onUploaded={assets => setValues(current => ({ ...current, [field.name]: [...(current[field.name] || field.defaultValue || '').split(',').filter(Boolean), ...assets.map(asset => asset.id)].join(',') }))} />
                      <AssetPicker disabled={mediaUploadBusy || busy} images={(field.options || []).map(option => ({ id: option.value, filename: option.label, url: option.imageUrl || '' }))} selected={(values[field.name] ?? field.defaultValue ?? '').split(',').filter(Boolean)} onChange={ids => setValues(current => ({ ...current, [field.name]: ids.join(',') }))} />
                      {!field.options?.length && <p className="text-xs text-muted-foreground">{t('imagesRequired')}</p>}
                    </>
                  )
                : field.type === 'select'
                  ? (
                      <Select value={values[field.name] ?? field.defaultValue ?? ''} onValueChange={value => setValues(current => ({ ...current, [field.name]: value }))} required={field.required !== false}>
                        <SelectTrigger id={`enterprise-${field.name}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{field.options?.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                      </Select>
                    )
                  : field.type === 'textarea'
                    ? <Textarea id={`enterprise-${field.name}`} required={field.required !== false} maxLength={field.maxLength} rows={5} value={values[field.name] ?? field.defaultValue ?? ''} onChange={e => setValues(current => ({ ...current, [field.name]: e.target.value }))} />
                    : <Input id={`enterprise-${field.name}`} type={field.type || 'text'} required={field.required !== false} maxLength={field.maxLength} value={values[field.name] ?? field.defaultValue ?? ''} onChange={e => setValues(current => ({ ...current, [field.name]: e.target.value }))} />}
            </div>
          ))}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy || mediaUploadBusy} onClick={() => { closeForm(); setValues({}); setError('') }}>{t('cancel')}</Button>
            <Button type="submit" disabled={busy || mediaUploadBusy}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
