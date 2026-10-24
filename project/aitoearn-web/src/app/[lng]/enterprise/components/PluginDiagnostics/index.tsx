'use client'

/** PluginDiagnostics - 区分站点 API、原插件与企业协议声明，始终保留人工流程。 */
import { useShallow } from 'zustand/react/shallow'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EnterprisePluginSource, inspectEnterprisePlugin } from '@/store/plugin/enterpriseAdapter'
import { runAction } from '../../store/workspace.actions'
import { useWorkspaceStore } from '../../store/workspaceStore'

export function PluginDiagnostics({ compact = false }: { compact?: boolean }) {
  const { t } = useTransClient('enterprise')
  const { inspection, preferred, setInspection, setPreferred, busy } = useWorkspaceStore(useShallow(s => ({ inspection: s.pluginInspection, preferred: s.preferredPluginSource, setInspection: s.setPluginInspection, setPreferred: s.setPreferredPluginSource, busy: s.busyAction })))
  return (
    <div className="space-y-3">
      {!compact && <p className="text-xs leading-6 text-muted-foreground">{t('pluginApiHelp')}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" loading={busy === 'enterprise-plugin-check'} disabled={!!busy} onClick={() => runAction('enterprise-plugin-check', async () => setInspection(await inspectEnterprisePlugin(preferred)))}>{t('checkExecutionConditions')}</Button>
        {inspection && (
          <span className="text-sm text-muted-foreground">
            {t(`pluginInspection.${inspection.status}`)}
            {inspection.version ? ` · ${inspection.version}` : ''}
          </span>
        )}
      </div>
      {inspection && inspection.availableSources.length > 1 && (
        <Select
          value={preferred || ''}
          onValueChange={(source) => {
            if (source === EnterprisePluginSource.Original || source === EnterprisePluginSource.Enterprise)
              setPreferred(source)
          }}
        >
          <SelectTrigger aria-label={t('choosePlugin')}><SelectValue placeholder={t('choosePlugin')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={EnterprisePluginSource.Original}>{t('originalPlugin')}</SelectItem>
            <SelectItem value={EnterprisePluginSource.Enterprise}>{t('enterprisePlugin')}</SelectItem>
          </SelectContent>
        </Select>
      )}
      {inspection && <p className="text-xs leading-6 text-muted-foreground">{inspection.supportsApprovalProtocol ? t('protocolDeclaredHelp') : t('manualFallbackHelp')}</p>}
    </div>
  )
}
