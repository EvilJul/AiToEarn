import { describe, expect, it } from 'vitest'
import { enterpriseJwtSecretSchema, isSharedBootstrapIdentity } from './enterprise-auth.policy'

describe('enterprise independent identity policy', () => {
  it('rejects both legacy reserved bootstrap identity and marked bootstrap tokens', () => {
    expect(isSharedBootstrapIdentity('admin@aitoearn.local')).toBe(true)
    expect(isSharedBootstrapIdentity('manager@example.invalid', true)).toBe(true)
    expect(isSharedBootstrapIdentity('manager@example.invalid', false)).toBe(false)
  })
  it.each(['', 'short-secret', 'change-this-jwt-secret-please-change-in-production', 'x'.repeat(64)])('rejects empty, short, placeholder or repetitive signing material', (value) => {
    expect(enterpriseJwtSecretSchema.safeParse(value).success).toBe(false)
  })
  it('accepts non-default signing material without exposing it', () => {
    expect(enterpriseJwtSecretSchema.safeParse('integration-only-4fea83720b62d129c077825dabe19658').success).toBe(true)
  })
})
