'use client'

/** KnowledgePanel - 企业事实来源和独立审核版本。 */
import type { Enterprise } from '@/api/enterprise/enterprise.types'
import { Plus } from 'lucide-react'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { createRecord, recordAction, runAction } from '../../store/workspace.actions'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { EmptyRecords, RecordList, RecordRow } from '../RecordList'

export function KnowledgePanel({ enterprise }: { enterprise: Enterprise }) {
  const { t, i18n } = useTransClient('enterprise')
  const images = useWorkspaceStore(s => s.data.images)
  const queueFilter = useWorkspaceStore(s => s.queueFilter)
  const allRecords = useWorkspaceStore(s => s.data.knowledge)
  const records = queueFilter === 'approved' ? allRecords.filter(record => record.status === 'approved') : allRecords
  const busy = useWorkspaceStore(s => s.busyAction)
  const openForm = useWorkspaceStore(s => s.openForm)
  const canWrite = ['admin', 'operator', 'reviewer'].includes(enterprise.role)
  const canReview = ['admin', 'reviewer'].includes(enterprise.role)
  return (
    <section className="space-y-5">
      <div className="flex justify-end">
        {canWrite && (
          <Button onClick={() => openForm({ title: t('addKnowledge'), fields: [{ name: 'title', label: t('fields.title') }, { name: 'category', label: t('fields.category'), type: 'select', options: ['product', 'price', 'case', 'faq', 'brand'].map(value => ({ value, label: t(`category.${value}`) })) }, { name: 'body', label: t('fields.facts'), type: 'textarea' }, { name: 'source', label: t('fields.source') }, { name: 'validUntil', label: t('fields.validUntil'), type: 'datetime-local' }, { name: 'evidenceAssetIds', label: t('evidenceImages'), type: 'assets', required: false, options: images.map(image => ({ value: image.id, label: image.filename, imageUrl: image.url })) }], submit: values => createRecord('knowledge', { ...values, evidenceAssetIds: values.evidenceAssetIds.split(',').filter(Boolean), validUntil: new Date(values.validUntil).toISOString() }) })}>
            <Plus className="mr-2 size-4" />
            {t('addKnowledge')}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t('knowledgeHelp')}</p>
      {!records.length ? <EmptyRecords /> : (
        <RecordList>
          {records.map(record => (
            <RecordRow
              key={record.id}
              title={record.title}
              status={record.status === 'approved' && new Date(record.validUntil) <= new Date() ? 'expired' : record.status}
              detail={(
                <>
                  {record.body}
                  <br />
                  {t('fields.source')}
                  :
                  {' '}
                  {record.source}
                  <p>
                    {t('knowledgeRevision')}
                    :
                    {' '}
                    {record.revision}
                    {' '}
                    ·
                    {' '}
                    {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeZone: enterprise.timezone }).format(new Date(record.validUntil))}
                  </p>
                </>
              )}
            >
              {canWrite && <Button variant="outline" onClick={() => openForm({ title: t('newKnowledgeRevision'), fields: [{ name: 'title', label: t('fields.title'), defaultValue: record.title }, { name: 'body', label: t('fields.facts'), type: 'textarea', defaultValue: record.body }, { name: 'source', label: t('fields.source'), defaultValue: record.source }, { name: 'validUntil', label: t('fields.validUntil'), type: 'datetime-local' }, { name: 'evidenceAssetIds', label: t('evidenceImages'), type: 'assets', required: false, options: images.map(image => ({ value: image.id, label: image.filename, imageUrl: image.url })) }], submit: values => createRecord('knowledge', { ...values, evidenceAssetIds: values.evidenceAssetIds.split(',').filter(Boolean), category: record.category, supersedesId: record.id, validUntil: new Date(values.validUntil).toISOString() }) })}>{t('newKnowledgeRevision')}</Button>}
              {canReview && record.status === 'draft' && <Button variant="outline" disabled={!!busy} onClick={() => runAction(record.id, () => recordAction(`knowledge/${record.id}/approve`, { expectedVersion: record.version }))}>{t('approve')}</Button>}
              {canReview && record.status === 'approved' && <Button variant="outline" disabled={!!busy} onClick={() => openForm({ title: t('withdraw'), fields: [{ name: 'reason', label: t('fields.reason'), type: 'textarea' }], submit: values => recordAction(`knowledge/${record.id}/withdraw`, { ...values, expectedVersion: record.version }) })}>{t('withdraw')}</Button>}
            </RecordRow>
          ))}
        </RecordList>
      )}
    </section>
  )
}
