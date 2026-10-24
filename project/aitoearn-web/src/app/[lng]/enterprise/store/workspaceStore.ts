import type { FormDialogState, WorkspaceData } from '../types'
import type { Enterprise, EnterpriseTab } from '@/api/enterprise/enterprise.types'
import type { EnterprisePluginInspection, EnterprisePluginSource } from '@/store/plugin/enterpriseAdapter'
import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { useEditorStore } from './editorStore'
import { useTemplateStore } from './templateStore'

export const useWorkspaceStore = create(combine({ sessionToken: '', enterprises: [] as Enterprise[], enterpriseId: '', tab: 'overview' as EnterpriseTab, queueFilter: 'all' as 'all' | 'approved' | 'pending_review' | 'open', refreshKey: 0, mediaUploadBusy: false, mediaUploadOperation: null as symbol | null, preferredPluginSource: null as EnterprisePluginSource | null, pluginInspection: null as EnterprisePluginInspection | null, data: { knowledge: [], topics: [], revisions: [], jobs: [], conversations: [], members: [], images: [], leads: [], notifications: [], executors: [], resources: [] } as WorkspaceData, form: null as FormDialogState | null, loading: false, dataAvailable: false, inboxUnavailable: false, error: '', busyAction: '' }, set => ({
  resetAuthentication(sessionToken?: string) { useEditorStore.getState().reset(); useTemplateStore.getState().reset(); set({ mediaUploadBusy: false, mediaUploadOperation: null, preferredPluginSource: null, pluginInspection: null, sessionToken: sessionToken || '', enterprises: [], enterpriseId: '', tab: 'overview', queueFilter: 'all', loading: false, dataAvailable: false, inboxUnavailable: false, error: '', form: null, data: { knowledge: [], topics: [], revisions: [], jobs: [], conversations: [], members: [], images: [], leads: [], notifications: [], executors: [], resources: [] } }) },
  setData(data: WorkspaceData) { set({ data, dataAvailable: true, inboxUnavailable: false }) },
  setPreferredPluginSource(preferredPluginSource: EnterprisePluginSource) { set({ preferredPluginSource, pluginInspection: null }) },
  setPluginInspection(pluginInspection: EnterprisePluginInspection) { set({ pluginInspection }) },
  setInboxUnavailable(inboxUnavailable: boolean) { set({ inboxUnavailable }) },
  clearQueueFilter() { set({ queueFilter: 'all' }) },
  setMediaUpload(mediaUploadOperation: symbol | null, mediaUploadBusy: boolean) { set({ mediaUploadOperation, mediaUploadBusy }) },
  setNotifications(notifications: WorkspaceData['notifications']) { set(state => ({ data: { ...state.data, notifications }, inboxUnavailable: false })) },
  setLoading(loading: boolean) { set({ loading }) },
  setError(error: string) { set({ error }) },
  openForm(form: FormDialogState) { set({ form }) },
  closeForm() { set({ form: null }) },
  setBusy(busyAction: string) { set({ busyAction }) },
  setEnterprises(enterprises: Enterprise[]) { set(state => ({ enterprises, enterpriseId: enterprises.some(e => e.id === state.enterpriseId) ? state.enterpriseId : enterprises[0]?.id || '' })) },
  selectEnterprise(enterpriseId: string) { useEditorStore.getState().reset(); useTemplateStore.getState().reset(); set({ mediaUploadBusy: false, mediaUploadOperation: null, preferredPluginSource: null, pluginInspection: null, enterpriseId, tab: 'overview', queueFilter: 'all', dataAvailable: false, inboxUnavailable: false, data: { knowledge: [], topics: [], revisions: [], jobs: [], conversations: [], members: [], images: [], leads: [], notifications: [], executors: [], resources: [] } }) },
  selectTab(tab: EnterpriseTab, queueFilter: 'all' | 'approved' | 'pending_review' | 'open' = 'all') { set({ tab, queueFilter }) },
  refresh() { set(state => ({ refreshKey: state.refreshKey + 1 })) },
})))
