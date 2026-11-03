import { afterEach, describe, expect, it, vi } from 'vitest'
import { findGlyphs, suggestedGlyphs } from '~/domain/look'
import { askIcon } from '~/domain/iconModel'
import type { Connection } from '~/domain/model'

const connection: Connection = { provider: 'custom', apiKey: 'test-only', baseUrl: 'https://example.test/v1', modelId: 'fake', model: 'fast' }

afterEach(() => vi.unstubAllGlobals())

describe('new page icons', () => {
  it.each([
    ['Дача', 'tree'], ['Сад', 'tree'], ['Подарки', 'gift'], ['Поездка', 'plane'], ['Книги', 'book'],
    ['Ремонт', 'roller'], ['Уборка', 'home'], ['Продукты', 'basket'], ['Задачи', 'check'], ['Идеи', 'bulb'],
    ['Здоровье', 'heart'], ['Спорт', 'heart'], ['Машина', 'car'], ['Кот', 'paw'], ['Другое', 'doc']
  ])('%s → %s', (title, glyph) => {
    expect(suggestedGlyphs(title)[0]).toBe(glyph)
  })

  it('offers three different named icons and finds the new glyphs', () => {
    expect(suggestedGlyphs('Дача')).toEqual(['tree', 'sun', 'plant'])
    expect(findGlyphs('дерев')[0]?.glyph).toBe('tree')
    expect(findGlyphs('валик')[0]?.glyph).toBe('roller')
  })

  it('accepts only offered icons from a compatible model', async () => {
    let glyph = 'sun'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ glyph }) } }] }), { headers: { 'content-type': 'application/json' } })))
    expect(await askIcon(connection, 'Дача')).toBe('sun')
    glyph = 'not-an-icon'
    expect(await askIcon(connection, 'Дача')).toBeNull()
  })

  it('falls back on provider failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))
    expect(await askIcon(connection, 'Дача')).toBeNull()
  })

  it('uses the provider-specific OpenAI and Anthropic responses', async () => {
    const fetch = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const body = url.includes('anthropic')
        ? { content: [{ type: 'tool_use', input: { glyph: 'tree' } }] }
        : { id: 'fake', object: 'response', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify({ glyph: 'roller' }) }] }] }
      return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetch)
    expect(await askIcon({ ...connection, provider: 'anthropic' }, 'Дача')).toBe('tree')
    expect(await askIcon({ ...connection, provider: 'openai' }, 'Ремонт')).toBe('roller')
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
