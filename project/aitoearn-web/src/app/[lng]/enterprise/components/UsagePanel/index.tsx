'use client'
import type { EnterpriseGeneration } from '@/api/enterprise/enterprise.types'
import { useEffect, useState } from 'react'
import { getEnterpriseUsage } from '@/api/enterprise/enterprise.api'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { requireSuccess } from '../../store/workspace.actions'

export function UsagePanel({ enterpriseId }: { enterpriseId: string }) {
  const { t } = useTransClient('enterprise')
  const [items, setItems] = useState<EnterpriseGeneration[]>([])
  const [error, setError] = useState(false)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let current = true
    setItems([]); setError(false)
    getEnterpriseUsage(enterpriseId).then((response) => {
      const data = requireSuccess(response); if (current)
        setItems(data)
    }).catch(() => {
      if (current)
        setError(true)
    })
    return () => { current = false }
  }, [enterpriseId, refresh])
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('usageLedgerHelp')}</p>
      <Button variant="outline" onClick={() => setRefresh(value => value + 1)}>{t('refresh')}</Button>
      {error ? <p role="alert">{t('error')}</p> : items.length === 0 ? <p className="text-sm text-muted-foreground">{t('usageEmpty')}</p> : items.map(item => (
        <div className="space-y-1 rounded-md border border-border p-3 text-sm" key={item.id}>
          <p>
            {t('generationTask')}
            :
            {' '}
            {item.taskId}
          </p>
          <p>
            {item.id}
            {' '}
            ·
            {' '}
            {t(`generationStatus.${item.status}`)}
          </p>
          <p>
            {item.result?.model || t('notConfigured')}
            {' '}
            ·
            {' '}
            {t('usageTokens')}
            :
            {' '}
            {item.result?.inputTokens ?? '—'}
            {' '}
            /
            {' '}
            {item.result?.outputTokens ?? '—'}
          </p>
          <p>
            {item.costStatus === 'known' && item.cost !== null ? `${item.currency} ${item.cost}` : t('usageUnknownCost')}
            {' '}
            ·
            {' '}
            {t(`settlement.${item.settlement}`)}
          </p>
        </div>
      ))}
    </div>
  )
}
