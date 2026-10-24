import { expect, test } from '@playwright/test'
import { EnterprisePluginSource, inspectEnterprisePlugin } from '../../src/store/plugin/enterpriseAdapter'

const original = { checkPermission: async () => ({ granted: true, hostAccess: true }), getVersion: async () => ({ version: '99.0.0' }) }
test('original version never implies enterprise approval support', async () => {
  const result = await inspectEnterprisePlugin(null, { original })
  expect(result.status).toBe('ready')
  expect(result.supportsApprovalProtocol).toBe(false)
})
test('missing website bridge is explicit', async () => {
  expect((await inspectEnterprisePlugin(null, {})).status).toBe('not_detected')
})
test('multiple extensions require explicit selection and do not overwrite either API', async () => {
  const enterprise = { getCapabilities: async () => ({ protocolVersion: 1, version: '1.0.0', hostAccess: true, capabilities: ['image_text', 'approval_gate', 'manual_confirmation'] }), executeApprovedTask: async () => ({}) }
  expect((await inspectEnterprisePlugin(null, { original, enterprise })).status).toBe('conflict')
  expect((await inspectEnterprisePlugin(EnterprisePluginSource.Original, { original, enterprise })).supportsApprovalProtocol).toBe(false)
  expect((await inspectEnterprisePlugin(EnterprisePluginSource.Enterprise, { original, enterprise })).supportsApprovalProtocol).toBe(true)
})
test('invalid capabilities and denied site access fail closed', async () => {
  expect((await inspectEnterprisePlugin(null, { enterprise: { getCapabilities: async () => ({ protocolVersion: 2 }) } })).status).toBe('incompatible')
  expect((await inspectEnterprisePlugin(null, { original: { checkPermission: async () => ({ granted: true, hostAccess: false }) } })).status).toBe('permission_required')
})
