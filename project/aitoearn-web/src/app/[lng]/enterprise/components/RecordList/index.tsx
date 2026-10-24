'use client'

import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

/** RecordList - 当前工作台私有列表、状态与空页面展示。 */

import { useTransClient } from '@/app/i18n/client'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/className'
import { useWorkspaceStore } from '../../store/workspaceStore'

export function RecordStatus({ value }: { value: string }) {
  const { t } = useTransClient('enterprise')
  return <Badge variant={value === 'rejected' || value === 'unknown' ? 'destructive' : 'outline'}>{t(`status.${value}`, { defaultValue: value })}</Badge>
}

export function EmptyRecords() {
  const filtered = useWorkspaceStore(s => s.queueFilter !== 'all')
  const { t } = useTransClient('enterprise')
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 text-center">
      <Inbox className="size-7 text-muted-foreground" />
      <h3 className="font-medium">{filtered ? t('queueEmptyTitle') : t('emptyTitle')}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{filtered ? t('queueEmptyHelp') : t('emptyDescription')}</p>
    </div>
  )
}

export function RecordList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border rounded-lg border border-border bg-card">{children}</div>
}

export function RecordRow({ title, detail, status, children, stacked = false }: { stacked?: boolean, title: string, detail?: ReactNode, status?: string, children?: ReactNode }) {
  return (
    <article className={cn('flex flex-col gap-4 p-5', !stacked && 'sm:flex-row sm:items-start sm:justify-between')}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="break-words font-medium">{title}</h3>
          {status && <RecordStatus value={status} />}
        </div>
        {detail && <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{detail}</div>}
      </div>
      <div className={cn('flex shrink-0 flex-wrap gap-2', stacked ? 'items-start' : 'items-center')}>{children}</div>
    </article>
  )
}
