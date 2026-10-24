import type { WorkspaceData } from '../../../types'
import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { getEnterpriseConversations, getEnterpriseExecutors, getEnterpriseImageAssets, getEnterpriseKnowledge, getEnterpriseLeads, getEnterpriseMembers, getEnterpriseNotifications, getEnterprisePublishJobs, getEnterpriseResources, getEnterpriseRevisions, getEnterprises, getEnterpriseTopics } from '@/api/enterprise/enterprise.api'
import { useTransClient } from '@/app/i18n/client'
import { useUserStore } from '@/store/user'
import { requireSuccess } from '../../../store/workspace.actions'
import { useWorkspaceStore } from '../../../store/workspaceStore'

export function useWorkspaceData() {
  const token = useUserStore(s => s.token)
  const authReady = useUserStore(s => s._hasHydrated)
  useEffect(() => { useWorkspaceStore.getState().resetAuthentication(token) }, [token])
  const { t, ready } = useTransClient('enterprise')
  const state = useWorkspaceStore(useShallow(s => ({ sessionToken: s.sessionToken, enterprises: s.enterprises, enterpriseId: s.enterpriseId, tab: s.tab, queueFilter: s.queueFilter, clearQueueFilter: s.clearQueueFilter, refreshKey: s.refreshKey, loading: s.loading, dataAvailable: s.dataAvailable, error: s.error, setEnterprises: s.setEnterprises, selectEnterprise: s.selectEnterprise, selectTab: s.selectTab, refresh: s.refresh, openForm: s.openForm })))
  const enterprise = token && state.sessionToken === token ? state.enterprises.find(e => e.id === state.enterpriseId) : undefined

  useEffect(() => {
    if (!authReady || !token)
      return
    let active = true
    getEnterprises().then((response) => {
      if (active)
        state.setEnterprises(requireSuccess(response))
    }).catch((error) => {
      if (active)
        useWorkspaceStore.getState().setError(error instanceof Error ? error.message : t('error'))
    })
    return () => { active = false }
  }, [token, authReady, state.refreshKey, state.setEnterprises])

  useEffect(() => {
    if (!enterprise || !enterprise.enabled)
      return
    let active = true
    const store = useWorkspaceStore.getState()
    store.setLoading(true)
    store.setError('')
    const contentAccess = ['admin', 'operator', 'reviewer'].includes(enterprise.role)
    const serviceAccess = ['admin', 'operator', 'sales'].includes(enterprise.role)
    const list = async <T>(request: Promise<{ code: string | number, data: T[], message: string } | null | undefined>) => requireSuccess(await request)
    Promise.all([
      list(getEnterpriseKnowledge(enterprise.id)),
      list(getEnterpriseTopics(enterprise.id)),
      contentAccess ? list(getEnterpriseRevisions(enterprise.id)) : Promise.resolve([]),
      contentAccess ? list(getEnterprisePublishJobs(enterprise.id)) : Promise.resolve([]),
      serviceAccess ? list(getEnterpriseConversations(enterprise.id)) : Promise.resolve([]),
      enterprise.role === 'admin' ? list(getEnterpriseMembers(enterprise.id)) : Promise.resolve([]),
      ['admin', 'operator', 'reviewer'].includes(enterprise.role) ? list(getEnterpriseImageAssets(enterprise.id)) : Promise.resolve([]),
      serviceAccess ? list(getEnterpriseLeads(enterprise.id)) : Promise.resolve([]),
      serviceAccess ? list(getEnterpriseNotifications(enterprise.id)) : Promise.resolve([]),
      list(getEnterpriseExecutors(enterprise.id)),
      list(getEnterpriseResources(enterprise.id)),
    ]).then(([knowledge, topics, revisions, jobs, conversations, members, images, leads, notifications, executors, resources]) => {
      if (active)
        store.setData({ knowledge, topics, revisions, jobs, conversations, members, images, leads, notifications, executors, resources } as WorkspaceData)
    }).catch((error) => {
      if (active)
        store.setError(error instanceof Error ? error.message : t('error'))
    }).finally(() => {
      if (active)
        store.setLoading(false)
    })
    return () => { active = false }
  }, [enterprise?.id, enterprise?.role, enterprise?.enabled, state.refreshKey])

  useEffect(() => {
    if (!enterprise?.enabled || !token || !['admin', 'operator', 'sales'].includes(enterprise.role))
      return
    let active = true
    let pending = false
    const interval = setInterval(async () => {
      if (pending)
        return
      pending = true
      try {
        const notifications = requireSuccess(await getEnterpriseNotifications(enterprise.id))
        if (active)
          useWorkspaceStore.getState().setNotifications(notifications)
      }
      catch {
        if (active)
          useWorkspaceStore.getState().setInboxUnavailable(true)
      }
      finally { pending = false }
    }, 15000)
    return () => { active = false; clearInterval(interval) }
  }, [enterprise?.id, enterprise?.enabled, enterprise?.role, token])

  return { state, enterprise, t, ready }
}
