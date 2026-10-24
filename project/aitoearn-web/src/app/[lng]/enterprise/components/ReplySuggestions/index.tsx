'use client'

/** ReplySuggestions - 引用已审核知识，始终由人工确认发送。 */

import type { ReplySuggestions as Suggestions } from '@/api/enterprise/enterprise.types'
import { useState } from 'react'
import { getEnterpriseReplySuggestions } from '@/api/enterprise/enterprise.api'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { requireSuccess, runAction } from '../../store/workspace.actions'

export function ReplySuggestions({ enterpriseId, conversationId }: { enterpriseId: string, conversationId: string }) {
  const { t } = useTransClient('enterprise')
  const [result, setResult] = useState<Suggestions | null>(null)
  return (
    <div className="space-y-3">
      <Button variant="outline" onClick={() => runAction(`suggestions-${conversationId}`, async () => setResult(requireSuccess(await getEnterpriseReplySuggestions(enterpriseId, conversationId))))}>{t('replySuggestions')}</Button>
      {result && (
        <div className="max-w-lg space-y-3 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">{t('replySuggestionsHelp')}</p>
          {!result.suggestions.length && <p className="text-sm">{t('noSuggestions')}</p>}
          {result.suggestions.map(suggestion => (
            <div key={suggestion.knowledgeId} className="space-y-2 text-sm">
              <h4 className="font-medium">{suggestion.title}</h4>
              <p className="whitespace-pre-wrap">{suggestion.answer}</p>
              <p className="text-xs text-muted-foreground">
                {t('fields.source')}
                :
                {' '}
                {suggestion.source}
              </p>
              <Button variant="ghost" size="sm" onClick={() => runAction(`copy-${conversationId}`, () => navigator.clipboard.writeText(suggestion.answer))}>{t('copySuggestion')}</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
