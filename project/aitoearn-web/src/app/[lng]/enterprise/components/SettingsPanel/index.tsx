'use client'

/** SettingsPanel - 企业设置、成员和插件的实际连接状态。 */

import type { Enterprise } from '@/api/enterprise/enterprise.types'
import { Cable, ShieldCheck } from 'lucide-react'
import { updateEnterprise, updateEnterpriseMember } from '@/api/enterprise/enterprise.api'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { usePluginStore } from '@/store/plugin'
import { createRecord, recordAction, requireSuccess, runAction } from '../../store/workspace.actions'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { PluginDiagnostics } from '../PluginDiagnostics'
import { RecordList, RecordRow } from '../RecordList'
import { UsagePanel } from '../UsagePanel'

export function SettingsPanel({ enterprise }: { enterprise: Enterprise }) {
  const { t, i18n } = useTransClient('enterprise')
  const members = useWorkspaceStore(s => s.data.members)
  const executors = useWorkspaceStore(s => s.data.executors)
  const resources = useWorkspaceStore(s => s.data.resources)
  const openForm = useWorkspaceStore(s => s.openForm)
  const status = usePluginStore(s => s.status)
  const version = usePluginStore(s => s.pluginVersion)
  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <ShieldCheck className="size-5 text-brand-ink" />
          <h3 className="font-semibold">{enterprise.name}</h3>
          <p className="text-sm text-muted-foreground">
            {enterprise.industry || t('notConfigured')}
            {' '}
            ·
            {' '}
            {enterprise.regions.join(' / ') || t('notConfigured')}
            <br />
            {enterprise.timezone}
          </p>
          {enterprise.role === 'admin' && <Button variant="outline" onClick={() => openForm({ title: t('editEnterprise'), fields: [{ name: 'name', label: t('fields.enterpriseName'), defaultValue: enterprise.name }, { name: 'industry', label: t('fields.industry'), defaultValue: enterprise.industry }, { name: 'regions', label: t('fields.regions'), defaultValue: enterprise.regions.join(',') }, { name: 'timezone', label: t('fields.timezone'), defaultValue: enterprise.timezone }, { name: 'responseReminderMinutes', label: t('responseReminderMinutes'), type: 'select', defaultValue: String(enterprise.responseReminderMinutes || 5), options: [5, 10, 15, 30, 60].map(value => ({ value: String(value), label: `${value} ${t('minutes')}` })) }, { name: 'allowSelfReview', label: t('fields.selfReview'), type: 'select', defaultValue: String(enterprise.allowSelfReview), options: [{ value: 'false', label: t('disabled') }, { value: 'true', label: t('enabled') }] }, { name: 'enabled', label: t('fields.enabled'), type: 'select', defaultValue: String(enterprise.enabled), options: [{ value: 'false', label: t('disabled') }, { value: 'true', label: t('enabled') }] }], submit: async (values) => { requireSuccess(await updateEnterprise(enterprise.id, { ...values, regions: values.regions.split(',').map(v => v.trim()).filter(Boolean), expectedVersion: enterprise.version, responseReminderMinutes: Number(values.responseReminderMinutes), enabled: values.enabled === 'true', allowSelfReview: values.allowSelfReview === 'true' })); useWorkspaceStore.getState().refresh() } })}>{t('editEnterprise')}</Button>}
        </div>
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <Cable className="size-5 text-brand-ink" />
          <h3 className="font-semibold">{t('pluginTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {t(`plugin.${status}`, { defaultValue: t('notConfigured') })}
            {version ? ` · ${version}` : ''}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">{t('pluginHelp')}</p>
          <PluginDiagnostics />
        </div>
      </div>
      {enterprise.role === 'admin' && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t('members')}</h3>
            <Button variant="outline" onClick={() => openForm({ title: t('addMember'), fields: [{ name: 'userId', label: t('fields.registeredUserId') }, { name: 'role', label: t('fields.role'), type: 'select', options: ['operator', 'reviewer', 'sales', 'admin'].map(value => ({ value, label: t(`role.${value}`) })) }], submit: values => createRecord('members', values) })}>{t('addMember')}</Button>
          </div>
          <RecordList>{members.map(member => <RecordRow key={member.id} title={member.id === 'owner' ? t('owner') : member.userId} detail={t(`role.${member.role}`)} status={member.active ? 'active' : 'inactive'}>{member.id !== 'owner' && <Button variant="outline" onClick={() => openForm({ title: t('editMember'), fields: [{ name: 'role', label: t('fields.role'), type: 'select', defaultValue: member.role, options: ['operator', 'reviewer', 'sales', 'admin'].map(value => ({ value, label: t(`role.${value}`) })) }, { name: 'active', label: t('fields.enabled'), type: 'select', defaultValue: String(member.active), options: [{ value: 'true', label: t('enabled') }, { value: 'false', label: t('disabled') }] }], submit: async (values) => { requireSuccess(await updateEnterpriseMember(enterprise.id, member.id, { ...values, active: values.active === 'true', expectedVersion: member.version })); useWorkspaceStore.getState().refresh() } })}>{t('editMember')}</Button>}</RecordRow>)}</RecordList>
        </>
      )}
      <section className="space-y-3">
        <h3 className="font-semibold">{t('executionDevices')}</h3>
        {!executors.length ? <p className="text-sm text-muted-foreground">{t('noExecutionDevices')}</p> : (
          <RecordList>
            {executors.map(device => (
              <RecordRow
                key={device.id}
                title={`${t('executionDevice')} ${device.deviceId.slice(0, 8)}`}
                status={device.revoked ? 'inactive' : device.online ? 'online' : 'offline'}
                detail={(
                  <>
                    {t('pluginVersion')}
                    :
                    {' '}
                    {device.pluginVersion}
                    <p>
                      {t('lastHeartbeat')}
                      :
                      {' '}
                      {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short', timeZone: enterprise.timezone }).format(new Date(device.lastHeartbeatAt))}
                    </p>
                  </>
                )}
              >
                {enterprise.role === 'admin' && !device.revoked && <Button variant="outline" onClick={() => runAction(device.id, () => recordAction(`executors/${device.id}/revoke`, {}))}>{t('revokeDevice')}</Button>}
              </RecordRow>
            ))}
          </RecordList>
        )}
      </section>
      <section className="space-y-3">
        <h3 className="font-semibold">{t('resourceBindings')}</h3>
        <p className="text-sm text-muted-foreground">{t('resourceBindingsHelp')}</p>
        <RecordList>{resources.map(resource => <RecordRow key={`${resource.kind}-${resource.resourceId}`} title={resource.name} detail={t(`resourceKind.${resource.kind}`)}>{enterprise.role === 'admin' && <Button variant="outline" onClick={() => runAction(resource.resourceId, () => recordAction('resources/revoke', { resourceId: resource.resourceId, kind: resource.kind }))}>{t('revokeBinding')}</Button>}</RecordRow>)}</RecordList>
      </section>
      <section className="space-y-3 rounded-lg border border-border bg-muted/30 p-5">
        <h3 className="font-semibold">{t('usageAndCost')}</h3>
        {['admin', 'operator', 'reviewer'].includes(enterprise.role) && <UsagePanel enterpriseId={enterprise.id} />}
      </section>
    </section>
  )
}
