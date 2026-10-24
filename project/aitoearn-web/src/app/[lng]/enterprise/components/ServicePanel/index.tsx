'use client'

import type { Enterprise } from '@/api/enterprise/enterprise.types'
import { MessageSquarePlus } from 'lucide-react'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { createRecord, recordAction, runAction } from '../../store/workspace.actions'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { ConversationThread } from '../ConversationThread'
import { LeadsPanel } from '../LeadsPanel'
import { EmptyRecords, RecordList, RecordRow } from '../RecordList'
import { ReplySuggestions } from '../ReplySuggestions'
/** ServicePanel - 人工咨询录入、销售接管与跟进。 */

export function ServicePanel({ enterprise }: { enterprise: Enterprise }) {
  const { t } = useTransClient('enterprise')
  const queueFilter = useWorkspaceStore(s => s.queueFilter)
  const allRecords = useWorkspaceStore(s => s.data.conversations)
  const records = queueFilter === 'open' ? allRecords.filter(record => record.state !== 'closed') : allRecords
  const busy = useWorkspaceStore(s => s.busyAction)
  const openForm = useWorkspaceStore(s => s.openForm)
  const canClaim = ['admin', 'sales'].includes(enterprise.role)
  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm leading-6">{t('manualServiceHelp')}</div>
      <div className="flex justify-end">
        <Button onClick={() => openForm({ title: t('addConversation'), fields: [{ name: 'customerName', label: t('fields.customerName') }, { name: 'channel', label: t('fields.channel'), type: 'select', defaultValue: 'rednote_dm', options: ['rednote_dm', 'rednote_comment', 'rednote_miniapp_service', 'manual'].map(value => ({ value, label: t(`channel.${value}`) })) }, { name: 'source', label: t('fields.source') }, { name: 'summary', label: t('fields.customerNeed'), type: 'textarea' }], submit: values => createRecord('conversations', values) })}>
          <MessageSquarePlus className="mr-2 size-4" />
          {t('addConversation')}
        </Button>
      </div>
      {!records.length ? <EmptyRecords /> : (
        <RecordList>
          {records.map(record => (
            <RecordRow
              key={record.id}
              title={record.customerName}
              status={record.state}
              detail={(
                <>
                  {t(`channel.${record.channel}`)}
                  {' '}
                  ·
                  {' '}
                  {record.source}
                  <p>{record.summary}</p>
                  {record.followUps.map((note, index) => <p key={index} className="mt-2 border-t border-border pt-2">{note}</p>)}
                </>
              )}
            >
              <ConversationThread enterpriseId={enterprise.id} conversationId={record.id} closed={record.state === 'closed'} />
              <ReplySuggestions enterpriseId={enterprise.id} conversationId={record.id} />
              {canClaim && record.state === 'waiting_human' && <Button disabled={!!busy} onClick={() => runAction(record.id, () => recordAction(`conversations/${record.id}/actions`, { expectedVersion: record.version, action: 'claim' }))}>{t('claim')}</Button>}
              {canClaim && record.state === 'human' && (
                <>
                  <Button variant="outline" disabled={!!busy} onClick={() => openForm({ title: t('followUp'), fields: [{ name: 'note', label: t('fields.followUp'), type: 'textarea' }], submit: values => recordAction(`conversations/${record.id}/actions`, { ...values, expectedVersion: record.version, action: 'follow-up' }) })}>{t('followUp')}</Button>
                  <Button variant="outline" disabled={!!busy} onClick={() => runAction(record.id, () => recordAction(`conversations/${record.id}/actions`, { expectedVersion: record.version, action: 'close' }))}>{t('closeConversation')}</Button>
                </>
              )}
            </RecordRow>
          ))}
        </RecordList>
      )}
      <LeadsPanel enterprise={enterprise} />
    </section>
  )
}
