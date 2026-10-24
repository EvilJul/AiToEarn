'use client'

import type { Enterprise } from '@/api/enterprise/enterprise.types'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
/** TopicsPanel - 来源、地域行业依据与采纳反馈。 */
import { useEditorStore } from '../../store/editorStore'
import { createRecord, recordAction, runAction } from '../../store/workspace.actions'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { EmptyRecords, RecordList, RecordRow } from '../RecordList'

export function TopicsPanel({ enterprise }: { enterprise: Enterprise }) {
  const { t } = useTransClient('enterprise')
  const records = useWorkspaceStore(s => s.data.topics)
  const openForm = useWorkspaceStore(s => s.openForm)
  const busy = useWorkspaceStore(s => s.busyAction)
  const [all, setAll] = useState(false)
  const shown = all ? records : records.filter(record => record.recommended)
  const canWrite = ['admin', 'operator'].includes(enterprise.role)
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={all} onCheckedChange={value => setAll(value === true)} />
          {t('showAllTopics')}
        </label>
        {canWrite && (
          <Button onClick={() => openForm({ title: t('addTopic'), fields: [{ name: 'title', label: t('fields.title') }, { name: 'source', label: t('fields.source') }, { name: 'sourceType', label: t('fields.category'), type: 'select', defaultValue: 'manual', options: ['manual', 'evergreen'].map(value => ({ value, label: t(`status.${value}`) })) }, { name: 'industry', label: t('fields.industry'), defaultValue: enterprise.industry }, { name: 'regions', label: t('fields.regions'), defaultValue: enterprise.regions.join(',') }, { name: 'keywords', label: t('fields.keywords') }, { name: 'occurredAt', label: t('fields.occurredAt'), type: 'datetime-local' }, { name: 'expiresAt', label: t('fields.validUntil'), type: 'datetime-local' }], submit: values => createRecord('topics', { ...values, regions: values.regions.split(',').map(v => v.trim()).filter(Boolean), keywords: values.keywords.split(',').map(v => v.trim()).filter(Boolean), occurredAt: new Date(values.occurredAt).toISOString(), expiresAt: new Date(values.expiresAt).toISOString() }) })}>
            <Plus className="mr-2 size-4" />
            {t('addTopic')}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t('topicsHelp')}</p>
      {!shown.length ? <EmptyRecords /> : (
        <RecordList>
          {shown.map(record => (
            <RecordRow
              key={record.id}
              title={record.title}
              status={record.expired ? 'expired' : record.sourceType}
              detail={(
                <>
                  {record.source}
                  <br />
                  {record.industry}
                  {' '}
                  ·
                  {' '}
                  {record.regions.join(' / ')}
                  <br />
                  {record.keywords.map(word => `#${word}`).join(' ')}
                  {record.recommended && <p>{t('matchReason')}</p>}
                </>
              )}
            >
              {canWrite && <Button variant="outline" disabled={!!busy || record.feedback === 'accepted'} onClick={() => runAction(record.id, () => recordAction(`topics/${record.id}/feedback`, { expectedVersion: record.version, feedback: 'accepted' }))}>{record.feedback === 'accepted' ? t('accepted') : t('accept')}</Button>}
              {canWrite && (
                <Button
                  disabled={!!busy || record.expired}
                  onClick={() => runAction(`create-${record.id}`, async () => {
                    if (record.feedback !== 'accepted')
                      await recordAction(`topics/${record.id}/feedback`, { expectedVersion: record.version, feedback: 'accepted' }); useEditorStore.getState().reset(); useEditorStore.getState().update({ topicId: record.id, title: record.title.slice(0, 20), topics: record.keywords.join(',') }); useWorkspaceStore.getState().selectTab('content')
                  })}
                >
                  {t('createFromTopic')}
                </Button>
              )}
            </RecordRow>
          ))}
        </RecordList>
      )}
    </section>
  )
}
