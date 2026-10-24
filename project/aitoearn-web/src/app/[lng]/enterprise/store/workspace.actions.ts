import type { RequestData } from '@/utils/request'
import { createEnterpriseRecord, runEnterpriseAction } from '@/api/enterprise/enterprise.api'
import { directTrans } from '@/app/i18n/client'
import { useWorkspaceStore } from './workspaceStore'

export function requireSuccess<T>(response: { code: string | number, data: T, message: string } | null | undefined) {
  if (!response || response.code !== 0)
    throw new Error(response?.message || directTrans('enterprise', 'error'))
  return response.data
}

export async function createRecord(resource: Parameters<typeof createEnterpriseRecord>[1], data: RequestData) {
  const store = useWorkspaceStore.getState()
  requireSuccess(await createEnterpriseRecord(store.enterpriseId, resource, data))
  store.refresh()
}

export async function recordAction(path: string, data: RequestData) {
  const store = useWorkspaceStore.getState()
  requireSuccess(await runEnterpriseAction(store.enterpriseId, path, data))
  store.refresh()
}

export async function runAction(key: string, action: () => Promise<unknown>) {
  const store = useWorkspaceStore.getState()
  if (store.busyAction)
    return
  store.setBusy(key)
  store.setError('')
  try { await action() }
  catch (error) { store.setError(error instanceof Error ? error.message : directTrans('enterprise', 'error')) }
  finally { store.setBusy('') }
}
