import { z } from 'zod'

export const enterpriseJwtSecretSchema = z.string().min(32).refine(value => !/^(?:change[-_]this|your[-_]|replace[-_])/i.test(value) && new Set(value).size >= 8, 'Use a random non-default JWT secret for enterprise mode')

/** scripts/init.mjs creates this reserved shared identity; it is never an enterprise member identity. */
export function isSharedBootstrapIdentity(mail?: string, sharedBootstrap?: boolean) {
  return sharedBootstrap === true || mail?.toLowerCase() === 'admin@aitoearn.local'
}
