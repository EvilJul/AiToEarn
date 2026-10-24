'use client'

/** OverviewPanel - 以可处理待办为中心的角色首页。 */

import type { Enterprise, EnterpriseTab } from '@/api/enterprise/enterprise.types'
import { ArrowRight, ClipboardCheck, Files, MessageSquare, Send } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { RecordList, RecordRow } from '../RecordList'

export function OverviewPanel({ enterprise }: { enterprise: Enterprise }) {
  const { t } = useTransClient('enterprise')
  const { data, selectTab } = useWorkspaceStore(useShallow(s => ({ data: s.data, selectTab: s.selectTab })))
  const contentAccess = ['admin', 'operator', 'reviewer'].includes(enterprise.role)
  const serviceAccess = ['admin', 'operator', 'sales'].includes(enterprise.role)
  const metrics = [
    { key: 'knowledge', tab: 'knowledge' as EnterpriseTab, count: data.knowledge.filter(k => k.status === 'approved').length, icon: Files },
    { key: 'review', tab: 'content' as EnterpriseTab, count: contentAccess ? data.revisions.filter(r => r.status === 'pending_review').length : null, icon: ClipboardCheck },
    { key: 'publishing', tab: 'publishing' as EnterpriseTab, count: contentAccess ? data.jobs.filter(j => !['published', 'cancelled'].includes(j.status)).length : null, icon: Send },
    { key: 'service', tab: 'service' as EnterpriseTab, count: serviceAccess ? data.conversations.filter(c => c.state !== 'closed').length : null, icon: MessageSquare },
  ]
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {metrics.map(metric => (
          <button disabled={metric.count === null} key={metric.key} onClick={() => selectTab(metric.tab, metric.key === 'knowledge' ? 'approved' : metric.key === 'review' ? 'pending_review' : 'open')} className="group cursor-pointer rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-sm">{t(`metric.${metric.key}`)}</span>
              <metric.icon className="size-4" />
            </div>
            <p className="mt-5 text-3xl font-semibold tabular-nums">{metric.count ?? '—'}</p>
            <p className="mt-2 text-xs text-muted-foreground">{metric.count === null ? t('noPermission') : t('viewQueue')}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t('nextSteps')}</h2>
          <RecordList>{[{ tab: 'knowledge' as EnterpriseTab, title: t('stepKnowledge'), description: t('stepKnowledgeHelp') }, ...(contentAccess ? [{ tab: 'content' as EnterpriseTab, title: t('stepContent'), description: t('stepContentHelp') }] : []), ...(serviceAccess ? [{ tab: 'service' as EnterpriseTab, title: t('stepService'), description: t('stepServiceHelp') }] : [])].map(step => <RecordRow key={step.tab} title={step.title} detail={step.description}><Button variant="ghost" size="icon" aria-label={step.title} onClick={() => selectTab(step.tab)}><ArrowRight className="size-4" /></Button></RecordRow>)}</RecordList>
        </section>
        <aside className="space-y-4 rounded-lg border border-border bg-muted/30 p-6">
          <h2 className="font-semibold">{t('deliveryMode')}</h2>
          <p className="text-sm leading-7 text-muted-foreground">{t('deliveryModeHelp')}</p>
          <div className="space-y-3 border-t border-border pt-4 text-sm">
            <p>{t('manualPublishAvailable')}</p>
            <p>{t('manualServiceAvailable')}</p>
            <p className="text-muted-foreground">{t('automationUnavailable')}</p>
          </div>
          <Button variant="outline" onClick={() => selectTab('settings')}>{t('nav.settings')}</Button>
        </aside>
      </div>
      <p className="text-xs text-muted-foreground">{t('recentDataHelp')}</p>
    </div>
  )
}
