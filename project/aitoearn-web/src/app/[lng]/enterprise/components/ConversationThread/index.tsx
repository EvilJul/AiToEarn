'use client'

/** ConversationThread - 最近人工登记的原始消息，不冒充平台实时同步。 */
import type { EnterpriseMessage } from '@/api/enterprise/enterprise.types'
import { useState } from 'react'
import { getEnterpriseMessages } from '@/api/enterprise/enterprise.api'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { recordAction, requireSuccess, runAction } from '../../store/workspace.actions'
import { useWorkspaceStore } from '../../store/workspaceStore'

export function ConversationThread({ enterpriseId, conversationId, closed }: { enterpriseId: string, conversationId: string, closed: boolean }) {
  const { t } = useTransClient('enterprise')
  const openForm = useWorkspaceStore(s => s.openForm)
  const [messages, setMessages] = useState<EnterpriseMessage[] | null>(null)
  return (
    <div className="min-w-0 max-w-full space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => runAction(`messages-${conversationId}`, async () => setMessages(requireSuccess(await getEnterpriseMessages(enterpriseId, conversationId))))}>{t('viewMessages')}</Button>
        {!closed && <Button variant="outline" onClick={() => { const requestId = crypto.randomUUID(); openForm({ title: t('addCustomerMessage'), fields: [{ name: 'body', label: t('fields.customerNeed'), type: 'textarea' }], submit: values => recordAction(`conversations/${conversationId}/messages`, { ...values, requestId }) }) }}>{t('addCustomerMessage')}</Button>}
      </div>
      {messages && (
        <div className="max-w-lg space-y-3 rounded-lg border border-border p-4 text-sm">
          <p className="text-xs text-muted-foreground">{t('messageHistoryHelp')}</p>
          {messages.map(message => <p key={message.id} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.body}</p>)}
        </div>
      )}
    </div>
  )
}
