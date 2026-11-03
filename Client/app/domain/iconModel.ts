import type { Connection } from './model'
import { modelOf, PROVIDERS } from './model'
import { GLYPH_WORDS, type Glyph } from './types'

const choices = GLYPH_WORDS.map(([glyph]) => glyph)
const schema = { type: 'object', properties: { glyph: { type: 'string', enum: choices } }, required: ['glyph'], additionalProperties: false }
const instructions = `Choose the best icon for a page title. Return only an icon from this list: ${GLYPH_WORDS.map(([id, words]) => `${id}: ${words}`).join('; ')}.`

/** The model can only select an offered icon. Failures leave the local suggestion intact. */
export async function askIcon(c: Connection, title: string, signal?: AbortSignal): Promise<Glyph | null> {
  try {
    const combined = signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000)
    let answer: unknown
    if (c.provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': c.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: modelOf(c), max_tokens: 128, system: instructions, messages: [{ role: 'user', content: title }], tools: [{ name: 'choose_icon', description: 'Choose the page icon', input_schema: schema }], tool_choice: { type: 'tool', name: 'choose_icon' } }),
        signal: combined
      })
      if (!res.ok) return null
      const json = await res.json()
      answer = json.content?.find((item: { type: string }) => item.type === 'tool_use')?.input
    } else {
      const OpenAI = (await import('openai')).default
      const client = new OpenAI({ apiKey: c.apiKey, baseURL: c.provider === 'custom' ? c.baseUrl.trim() : PROVIDERS[c.provider].baseURL, dangerouslyAllowBrowser: true, maxRetries: 0, timeout: 10_000 })
      if (c.provider === 'openai') {
        const res = await client.responses.create({ model: modelOf(c), instructions, input: title, text: { format: { type: 'json_schema', name: 'icon', strict: true, schema } }, store: false }, { signal: combined })
        answer = JSON.parse(res.output_text)
      } else {
        const res = await client.chat.completions.create({ model: modelOf(c), messages: [{ role: 'system', content: instructions }, { role: 'user', content: title }], response_format: { type: 'json_schema', json_schema: { name: 'icon', strict: true, schema } } }, { signal: combined })
        answer = JSON.parse(res.choices[0]?.message?.content ?? '{}')
      }
    }
    const glyph = (answer as { glyph?: unknown } | null)?.glyph
    return typeof glyph === 'string' && choices.includes(glyph as Glyph) ? glyph as Glyph : null
  } catch {
    return null
  }
}
