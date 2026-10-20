import { afterEach, describe, expect, it, vi } from 'vitest'
import { askModel, checkConnection, isConnected, modelOf, type Connection } from '~/domain/model'
import { readResult } from '~/domain/prompt'
import { challengeFor } from '~/domain/openrouter'

const answer = { kind: 'record', pageId: 'p1', items: [{ text: 'Хлеб', date: null, time: null, qty: null, option: null }], guesses: [], newPageName: null }
const conn = (c: Partial<Connection>): Connection => ({ provider: 'openai', apiKey: 'k', baseUrl: '', modelId: '', model: 'fast', ...c })

/** Every request the app makes, answered the way the service would */
function serve(reply: (url: string, body: Record<string, unknown>) => unknown, status = 200) {
  const calls: { url: string, headers: Headers, body: Record<string, unknown> }[] = []
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const body = JSON.parse(String(init?.body ?? '{}'))
    calls.push({ url, headers: new Headers(init?.headers), body })
    return new Response(JSON.stringify(reply(url, body)), { status, headers: { 'content-type': 'application/json' } })
  }))
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('model connection', () => {
  it('picks the model: typed in, else Быстрая or Точная of the service', () => {
    expect(modelOf(conn({}))).toBe('gpt-6-luna')
    expect(modelOf(conn({ model: 'exact' }))).toBe('gpt-6-sol')
    expect(modelOf(conn({ provider: 'anthropic' }))).toBe('claude-haiku-5-5')
    expect(modelOf(conn({ modelId: ' my-model ' }))).toBe('my-model')
    expect(isConnected(conn({ provider: 'custom' }))).toBe(false)
    expect(isConnected(conn({ provider: 'custom', baseUrl: 'https://x/v1', modelId: 'm' }))).toBe(true)
  })

  it('asks OpenAI through the Responses API with a strict schema', async () => {
    const calls = serve(() => ({ id: 'r', object: 'response', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(answer) }] }] }))
    const result = await askModel(conn({}), 'хлеб', [], Date.now())
    expect(result.pageId).toBe('p1')
    expect(calls[0]!.url).toBe('https://api.openai.com/v1/responses')
    expect(calls[0]!.body).toMatchObject({ model: 'gpt-6-luna', reasoning: { effort: 'low' }, store: false, text: { format: { type: 'json_schema', strict: true } } })
  })

  it('asks OpenRouter and other compatible APIs through Chat Completions', async () => {
    const calls = serve(() => ({ id: 'c', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: '```json\n' + JSON.stringify(answer) + '\n```' } }] }))
    const result = await askModel(conn({ provider: 'openrouter' }), 'хлеб', [], Date.now())
    expect(result.items[0]!.text).toBe('Хлеб')
    expect(calls[0]!.url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(calls[0]!.body).toMatchObject({ model: 'openai/gpt-6-luna', response_format: { type: 'json_schema' } })
    await askModel(conn({ provider: 'custom', baseUrl: 'https://llm.example/v1', modelId: 'luna' }), 'хлеб', [], Date.now())
    expect(calls[1]!.url).toBe('https://llm.example/v1/chat/completions')
  })

  it('asks Anthropic straight from the browser with a forced tool call', async () => {
    const calls = serve(() => ({ content: [{ type: 'tool_use', id: 't', name: 'file_line', input: answer }] }))
    const result = await askModel(conn({ provider: 'anthropic' }), 'хлеб', [], Date.now())
    expect(result.kind).toBe('record')
    expect(calls[0]!.url).toBe('https://api.anthropic.com/v1/messages')
    expect(calls[0]!.headers.get('anthropic-dangerous-direct-browser-access')).toBe('true')
    expect(calls[0]!.headers.get('x-api-key')).toBe('k')
    expect(calls[0]!.body).toMatchObject({ model: 'claude-haiku-5-5', tool_choice: { type: 'tool', name: 'file_line' } })
  })

  it('tells a refused key from a missing model', async () => {
    serve(() => ({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }), 401)
    expect(await checkConnection(conn({ provider: 'anthropic' }))).toBe('key')
    serve(() => ({ error: { message: 'The model does not exist', type: 'invalid_request_error', code: 'model_not_found' } }), 404)
    expect(await checkConnection(conn({ modelId: 'gpt-nope' }))).toBe('model')
  })

  it('reads a sloppy answer without failing', () => {
    expect(readResult('not json')).toEqual({ kind: 'unclear', pageId: null, items: [], guesses: [], newPageName: null })
    expect(readResult({ kind: 'record', pageId: ' p2 ', items: [{ text: ' Сыр ' }, { text: '' }], guesses: ['a', 3] }))
      .toEqual({ kind: 'record', pageId: 'p2', items: [{ text: 'Сыр', date: null, time: null, qty: null, option: null }], guesses: ['a'], newPageName: null })
  })

  it('makes the PKCE challenge of RFC 7636', async () => {
    expect(await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})
