import { z } from 'zod'

export enum EnterprisePluginSource {
  None = 'none',
  Original = 'original',
  Enterprise = 'enterprise',
  Conflict = 'conflict',
}

interface OriginalPluginSurface {
  checkPermission: () => Promise<unknown>
  getVersion?: () => Promise<unknown>
}

export interface EnterprisePluginSurface {
  getCapabilities: () => Promise<unknown>
  executeApprovedTask?: (task: unknown) => Promise<unknown>
}

export interface EnterprisePluginSurfaces {
  original?: OriginalPluginSurface
  enterprise?: EnterprisePluginSurface
}

export interface EnterprisePluginInspection {
  source: EnterprisePluginSource
  availableSources: EnterprisePluginSource[]
  status: 'not_detected' | 'ready' | 'permission_required' | 'incompatible' | 'unavailable' | 'conflict'
  version: string | null
  supportsApprovalProtocol: boolean
}

declare global {
  interface Window {
    AiToEarnEnterpriseExtension?: EnterprisePluginSurface
  }
}

const capabilitiesSchema = z.object({
  protocolVersion: z.literal(1),
  version: z.string().min(1),
  hostAccess: z.boolean(),
  capabilities: z.array(z.enum(['image_text', 'approval_gate', 'manual_confirmation'])),
})

async function withDeadline<T>(promise: Promise<T>) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Plugin inspection timed out')), 1500) })])
  }
  finally {
    if (timeout)
      clearTimeout(timeout)
  }
}

/** Discovery only: protocol declarations never enable server execution or imply platform verification. */
export async function inspectEnterprisePlugin(preferred?: EnterprisePluginSource | null, surfaces?: EnterprisePluginSurfaces): Promise<EnterprisePluginInspection> {
  const apis = surfaces || (typeof window === 'undefined' ? {} : { original: window.AIToEarnPlugin, enterprise: window.AiToEarnEnterpriseExtension })
  const availableSources = [apis.original ? EnterprisePluginSource.Original : null, apis.enterprise ? EnterprisePluginSource.Enterprise : null].filter((source): source is EnterprisePluginSource => source !== null)
  const base = { availableSources, version: null, supportsApprovalProtocol: false }
  if (availableSources.length > 1 && !preferred)
    return { ...base, source: EnterprisePluginSource.Conflict, status: 'conflict' }
  const source = preferred || availableSources[0] || EnterprisePluginSource.None
  if (!availableSources.includes(source))
    return { ...base, source: EnterprisePluginSource.None, status: 'not_detected' }
  try {
    if (source === EnterprisePluginSource.Original && apis.original) {
      const permission = z.object({ granted: z.boolean(), hostAccess: z.boolean().optional() }).safeParse(await withDeadline(apis.original.checkPermission()))
      if (!permission.success)
        return { ...base, source, status: 'incompatible' }
      const version = apis.original.getVersion ? z.object({ version: z.string().min(1) }).safeParse(await withDeadline(apis.original.getVersion())) : null
      return { ...base, source, version: version?.success ? version.data.version : null, status: permission.data.granted && permission.data.hostAccess !== false ? 'ready' : 'permission_required' }
    }
    if (source === EnterprisePluginSource.Enterprise && apis.enterprise) {
      const result = capabilitiesSchema.safeParse(await withDeadline(apis.enterprise.getCapabilities()))
      if (!result.success)
        return { ...base, source, status: 'incompatible' }
      const declared = new Set<string>(result.data.capabilities)
      return { ...base, source, version: result.data.version, status: result.data.hostAccess ? 'ready' : 'permission_required', supportsApprovalProtocol: result.data.hostAccess && ['image_text', 'approval_gate', 'manual_confirmation'].every(capability => declared.has(capability)) && typeof apis.enterprise.executeApprovedTask === 'function' }
    }
    return { ...base, source, status: 'incompatible' }
  }
  catch { return { ...base, source, status: 'unavailable' } }
}
