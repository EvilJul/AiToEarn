'use client'

/** RevisionHistory - 原版本与新版本对照，以及真实审核事件记录。 */
import type { EnterpriseAuditEvent, EnterpriseRevision } from '@/api/enterprise/enterprise.types'
import { useState } from 'react'
import { getEnterpriseRevision, getEnterpriseRevisionHistory } from '@/api/enterprise/enterprise.api'
import { useTransClient } from '@/app/i18n/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { requireSuccess, runAction } from '../../store/workspace.actions'
import { useWorkspaceStore } from '../../store/workspaceStore'

export function RevisionHistory({ revision, enterpriseId, timezone }: { revision: EnterpriseRevision, enterpriseId: string, timezone: string }) {
  const { t, i18n } = useTransClient('enterprise')
  const busy = useWorkspaceStore(s => s.busyAction)
  const [result, setResult] = useState<{ parent: EnterpriseRevision | null, events: EnterpriseAuditEvent[] } | null>(null)
  const changes = result?.parent ? [result.parent.title !== revision.title ? t('titleChanged') : '', result.parent.body !== revision.body ? t('bodyChanged') : '', JSON.stringify([result.parent.imageAssetIds, result.parent.imageHashes]) !== JSON.stringify([revision.imageAssetIds, revision.imageHashes]) ? t('imagesChanged') : '', JSON.stringify(result.parent.topics) !== JSON.stringify(revision.topics) ? t('topicsChanged') : ''].filter(Boolean) : []
  return (
    <div className="min-w-0 max-w-full space-y-3">
      <Button
        variant="outline"
        loading={busy === `history-${revision.id}`}
        disabled={!!busy}
        onClick={() => {
          if (result) { setResult(null); return }
          return runAction(`history-${revision.id}`, async () => {
            const [history, parent] = await Promise.all([getEnterpriseRevisionHistory(enterpriseId, revision.id), revision.parentRevisionId ? getEnterpriseRevision(enterpriseId, revision.parentRevisionId) : Promise.resolve(null)])
            setResult({ events: requireSuccess(history), parent: parent ? requireSuccess(parent) : null })
          })
        }}
      >
        {result ? t('hideHistory') : t('reviewHistory')}
      </Button>
      {result && (
        <div className="max-w-2xl space-y-4 rounded-lg border border-border p-4 text-sm">
          <div className="flex flex-wrap gap-2">{changes.map(change => <Badge key={change} variant="secondary">{change}</Badge>)}</div>
          {result.parent && (
            <div className="grid gap-4 sm:grid-cols-2">
              <section className="min-w-0">
                <h4 className="font-medium">{t('previousRevision')}</h4>
                <p className="mt-2 whitespace-pre-wrap break-words">
                  {result.parent.title}
                  <br />
                  {result.parent.body}
                </p>
              </section>
              <section className="min-w-0">
                <h4 className="font-medium">{t('currentRevision')}</h4>
                <p className="mt-2 whitespace-pre-wrap break-words">
                  {revision.title}
                  <br />
                  {revision.body}
                </p>
              </section>
            </div>
          )}
          <ol className="space-y-3">
            {result.events.map(event => (
              <li key={event.id} className="space-y-1 border-t border-border pt-3">
                <p>{t(`audit.${event.action.replaceAll('.', '_')}`, { defaultValue: event.action })}</p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat(i18n.language, { timeZone: timezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.createdAt))}
                  {' '}
                  ·
                  {' '}
                  {event.actorId}
                </p>
                {event.reason && <p className="whitespace-pre-wrap break-words">{event.reason}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
