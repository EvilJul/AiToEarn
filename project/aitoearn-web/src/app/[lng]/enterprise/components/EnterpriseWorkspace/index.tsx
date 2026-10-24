'use client'

import type { EnterpriseTab } from '@/api/enterprise/enterprise.types'
import { ArrowLeft, Building2, Loader2, Plus, RefreshCw } from 'lucide-react'
import Link from 'next/link'

import { createEnterprise } from '@/api/enterprise/enterprise.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/className'
import { requireSuccess } from '../../store/workspace.actions'
import { ContentPanel } from '../ContentPanel'
import { KnowledgePanel } from '../KnowledgePanel'
import { OverviewPanel } from '../OverviewPanel'
import { PublishingPanel } from '../PublishingPanel'
import { ServicePanel } from '../ServicePanel'
import { SettingsPanel } from '../SettingsPanel'
import { TopicsPanel } from '../TopicsPanel'
import { WorkflowDialog } from '../WorkflowDialog'
import { useWorkspaceData } from './hooks/useWorkspaceData'
/** EnterpriseWorkspace - 企业选择、岗位导航和经过鉴权的数据加载。 */

export function EnterpriseWorkspace() {
  const { state, enterprise, t, ready } = useWorkspaceData()
  const create = () => state.openForm({ title: t('createEnterprise'), fields: [{ name: 'name', label: t('fields.enterpriseName') }, { name: 'industry', label: t('fields.industry') }, { name: 'regions', label: t('fields.regions') }, { name: 'timezone', label: t('fields.timezone'), defaultValue: 'Asia/Shanghai' }], submit: async (values) => { requireSuccess(await createEnterprise({ ...values, regions: values.regions.split(',').map(v => v.trim()).filter(Boolean) })); state.refresh() } })
  const tabs: EnterpriseTab[] = ['overview', 'knowledge', ...(!enterprise || enterprise.role !== 'sales' ? ['topics', 'content', 'publishing'] as EnterpriseTab[] : []), ...(!enterprise || enterprise.role !== 'reviewer' ? ['service'] as EnterpriseTab[] : []), 'settings']
  const allowed = tabs.includes(state.tab)

  if (!ready) {
    return (
      <div className="space-y-5 p-8">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1480px] space-y-7 p-4 md:p-7 lg:p-9">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-6">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <Building2 className="size-5 text-brand-ink" />
            <span className="text-sm font-medium text-muted-foreground">{t('product')}</span>
            <Badge variant="outline">{t('platform')}</Badge>
          </div>
          <h1 className="break-words [overflow-wrap:anywhere] text-2xl font-semibold tracking-tight">{enterprise?.name || t('title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          {!!state.enterprises.length && (
            <Select value={state.enterpriseId} onValueChange={state.selectEnterprise}>
              <SelectTrigger className="w-48" aria-label={t('selectEnterprise')}><SelectValue /></SelectTrigger>
              <SelectContent>{state.enterprises.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Button variant="outline" size="icon" aria-label={t('refresh')} onClick={state.refresh} disabled={state.loading}>{state.loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}</Button>
          <Button variant="outline" onClick={create}>
            <Plus className="mr-2 size-4" />
            {t('createEnterprise')}
          </Button>
        </div>
      </header>
      {state.error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span>{state.error}</span>
          <Button variant="outline" onClick={state.refresh}>{t('retry')}</Button>
        </div>
      )}
      {!enterprise ? (
        <div className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border p-8 text-center">
          <Building2 className="size-9 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t('startTitle')}</h2>
          <p className="max-w-lg text-sm leading-7 text-muted-foreground">{t('startHelp')}</p>
          <Button onClick={create}>{t('createEnterprise')}</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1" aria-label={t('workspaceNav')}>{tabs.map(tab => <button key={tab} onClick={() => state.selectTab(tab)} aria-current={state.tab === tab ? 'page' : undefined} className={cn('cursor-pointer whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', state.tab === tab ? 'bg-background font-medium text-brand-ink shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{t(`nav.${tab}`)}</button>)}</nav>
            <Badge variant="outline">{t(`role.${enterprise.role}`)}</Badge>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t(`nav.${state.tab}`)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t(`description.${state.tab}`)}</p>
              {state.queueFilter !== 'all' && <Button className="mt-2" variant="outline" size="sm" onClick={state.clearQueueFilter}>{t('clearQueueFilter')}</Button>}
            </div>
          </div>
          {(!enterprise.enabled && state.tab !== 'settings') ? <p role="status" className="rounded-lg border border-border p-6">{t('enterpriseDisabled')}</p> : state.error && !state.dataAvailable ? <p className="py-8 text-sm text-muted-foreground">{t('dataUnavailable')}</p> : (state.loading || (!state.dataAvailable && enterprise.enabled)) ? (
            <div aria-busy="true" className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          ) : !allowed ? <p>{t('noPermission')}</p> : (
            <>
              {state.tab === 'overview' && <OverviewPanel enterprise={enterprise} />}
              {state.tab === 'knowledge' && <KnowledgePanel enterprise={enterprise} />}
              {state.tab === 'topics' && <TopicsPanel enterprise={enterprise} />}
              {state.tab === 'content' && <ContentPanel enterprise={enterprise} />}
              {state.tab === 'publishing' && <PublishingPanel enterprise={enterprise} />}
              {state.tab === 'service' && <ServicePanel enterprise={enterprise} />}
              {state.tab === 'settings' && <SettingsPanel enterprise={enterprise} />}
            </>
          )}
        </>
      )}
      <footer className="border-t border-border pt-5 text-xs text-muted-foreground">
        <Link href="/" className="inline-flex items-center gap-2 hover:text-foreground">
          <ArrowLeft className="size-3" />
          {t('back')}
        </Link>
      </footer>
      <WorkflowDialog />
    </div>
  )
}
