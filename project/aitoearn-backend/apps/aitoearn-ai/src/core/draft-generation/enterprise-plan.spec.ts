import { describe, expect, it, vi } from 'vitest'
import { DraftGenerationPlannerService } from './draft-generation-planner.service'

const call = vi.hoisted(() => vi.fn())
vi.mock('ai', () => ({ generateText: call, Output: { object: (value: unknown) => value } }))
vi.mock('@ai-sdk/openai', () => ({ createOpenAI: () => ({ chat: (model: string) => ({ model }) }) }))
vi.mock('../../config', () => ({ config: { ai: { models: { chat: [{ name: 'fixture-planner', channel: 'openai', scenes: ['draft-generation'] }] }, draftGeneration: { planner: { defaultModel: 'fixture-planner' } }, openai: { apiKey: 'fixture-only', baseUrl: 'http://provider.invalid' } } } }))
vi.mock('@yikart/mongodb', () => ({ AiLogChannel: { OpenAI: 'openai', Gemini: 'gemini', DeepSeek: 'deepseek' } }))
vi.mock('../ai/relay-media', () => ({ RelayMediaResolverService: class {} }))

describe('enterprise uses the configured draft planner', () => {
  it('returns provider metering with no hidden provider retries or personal memory', async () => {
    call.mockResolvedValue({ output: { titleSourceId: 'source', excerpts: [{ sourceId: 'source', text: 'Approved fact.' }], layout: 'cover' }, response: { id: 'request-fixture' }, usage: { inputTokens: 12, outputTokens: 8 } })
    const availability = { execute: async (_context: unknown, run: () => Promise<unknown>) => run() }
    const service = new DraftGenerationPlannerService(availability as ConstructorParameters<typeof DraftGenerationPlannerService>[0])
    const input = { sources: [{ id: 'source', title: 'Approved title', body: 'Approved fact.', category: 'product' }], topic: 'fixture topic' }
    const result = await service.planEnterprise(input)
    expect(result).toMatchObject({ model: 'fixture-planner', provider: 'openai', providerRequestId: 'request-fixture', inputTokens: 12, outputTokens: 8 })
    const request = call.mock.calls[0][0]
    expect(request.maxRetries).toBe(0)
    expect(request.model).toEqual({ model: 'fixture-planner' })
    expect(JSON.parse(request.prompt)).toEqual(input)
    expect(request).not.toHaveProperty('tools')
    expect(request.abortSignal).toBeInstanceOf(AbortSignal)
  })
})
