'use client'

/** RevisionEvidence - 审核时按版本读取企业事实，不把“已生成”当作证据。 */
import type { EnterpriseKnowledge } from '@/api/enterprise/enterprise.types'
import { useState } from 'react'
import { getEnterpriseKnowledgeVersion } from '@/api/enterprise/enterprise.api'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { requireSuccess, runAction } from '../../store/workspace.actions'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { RecordStatus } from '../RecordList'

export function RevisionEvidence({ enterpriseId, knowledgeIds }: { enterpriseId: string, knowledgeIds: string[] }) {
  const { t } = useTransClient('enterprise')
  const busy = useWorkspaceStore(s => s.busyAction)
  const [records, setRecords] = useState<EnterpriseKnowledge[] | null>(null)
  const key = `evidence-${knowledgeIds.join('-')}`
  return (
    <div className="mt-3 min-w-0 space-y-3">
      <Button
        variant="outline"
        loading={busy === key}
        disabled={!!busy}
        onClick={() => {
          if (records) { setRecords(null); return }
          return runAction(key, async () => {
            const values = await Promise.all(knowledgeIds.map(async id => requireSuccess(await getEnterpriseKnowledgeVersion(enterpriseId, id))))
            setRecords(values)
          })
        }}
      >
        {t('factEvidence')}
      </Button>
      {records && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          {records.map(record => (
            <section key={record.id} className="space-y-2">
              <h4 className="flex flex-wrap items-center gap-2 font-medium">
                {record.title}
                <RecordStatus value={record.status} />
              </h4>
              <p className="whitespace-pre-wrap break-words">{record.body}</p>
              <p className="text-xs text-muted-foreground">
                {t('fields.source')}
                :
                {' '}
                {record.source}
                {' '}
                ·
                {' '}
                {t('knowledgeRevision')}
                {' '}
                {record.revision}
              </p>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
