// Sync through S3 (sync delta, items 7, 8, 10, 12, 14–16): the request signature, the merge rules, and two devices
// on one bucket in memory. Keys are made up (the signer's vector is AWS's own documentation example).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { useCloudStore } from '~/stores/cloud'
import { amzDateOf, authorization, failOf, sha256 } from '~/domain/s3'
import { DATA_KEY, emptySide, fileOf, firstMerge, mergeSides, noneGone, parseFile, receiptText, stateText, signOf, type Side } from '~/domain/bucket'
import { parseSnapshot, toJSON } from '~/domain/export'
import { firstRun } from '~/domain/seed'
import { newRecord } from '~/domain/factory'
import { fakeS3, type FakeS3 } from './fakeS3'

const KEY = { keyId: 'YCAJEtestkey', secret: 'YCPtestsecret0042' }
const FORM = { bucket: 'cerulean-test', ...KEY }
let n = 0
let s3: FakeS3
/** Devices of the running test: let go after it, so no late round trip reaches the next test's bucket */
let devices: { cloud: ReturnType<typeof useCloudStore> }[] = []

beforeEach(() => {
  s3 = fakeS3({ [KEY.keyId]: KEY.secret })
  vi.stubGlobal('fetch', s3.fetch)
})
afterEach(async () => {
  for (const d of devices) {
    await d.cloud.roundTrip()
    d.cloud.disconnect()
  }
  devices = []
  vi.unstubAllGlobals()
})

/** One device: its own browser (database) and its own app */
async function device(opts: { demo?: boolean } = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const data = useDataStore(pinia)
  await data.init({ ...opts, dbName: `sync-${++n}` })
  // Another device's round trip may have run meanwhile
  const cloud = useCloudStore(pinia)
  cloud.start()
  const on = <T>(fn: () => T): T => {
    setActivePinia(pinia)
    return fn()
  }
  devices.push({ cloud })
  return { data, cloud, on }
}

const bucketFile = () => JSON.parse(s3.objects.get(`cerulean-test/${DATA_KEY}`)!.body) as Side & { format: number }
const pageNamed = (d: ReturnType<typeof useDataStore>, title: string) => d.livePages.filter(p => p.title === title)

describe('signature V4', () => {
  it('matches AWS\'s documented GET Object example', async () => {
    // https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html (example credentials)
    const payload = await sha256('')
    const auth = await authorization({
      method: 'GET',
      url: new URL('https://examplebucket.s3.amazonaws.com/test.txt'),
      headers: { 'range': 'bytes=0-9', 'x-amz-content-sha256': payload, 'x-amz-date': '20130524T000000Z' },
      payload
    }, { region: 'us-east-1', keyId: 'AKIAIOSFODNN7EXAMPLE', secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' }, '20130524T000000Z')
    expect(auth).toBe('AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41')
    expect(amzDateOf(new Date('2013-05-24T00:00:00.000Z'))).toBe('20130524T000000Z')
  })

  it('reads S3\'s error codes into what Настройки say', () => {
    const xml = (code: string) => `<Error><Code>${code}</Code></Error>`
    expect(failOf(403, xml('InvalidAccessKeyId')).reason).toBe('key')
    expect(failOf(403, xml('SignatureDoesNotMatch')).reason).toBe('key')
    expect(failOf(403, xml('AccessDenied')).reason).toBe('access')
    expect(failOf(404, xml('NoSuchBucket')).reason).toBe('reach')
    expect(failOf(412, xml('PreconditionFailed')).reason).toBe('conflict')
    expect(failOf(501, xml('NotImplemented')).reason).toBe('unsupported')
    expect(failOf(500, '').reason).toBe('reach')
  })
})

describe('merging two sides', () => {
  const page = (id: string, at: number) => ({ ...firstRun().pages[2]!, id, title: id, updatedAt: at })
  const side = (patch: Partial<Side>): Side => ({ ...emptySide(), ...patch })

  it('the later version wins whole; equal stamps are one version', () => {
    const m = mergeSides(side({ pages: [page('a', 5), page('b', 9), page('c', 3)] }), side({ pages: [page('a', 7), page('b', 2), page('c', 3)] }))
    expect(m.take.pages.map(p => p.id)).toEqual(['a'])
    expect(m.ahead).toBe(true) // b is later here
    expect(m.top).toBe(7)
  })

  it('a tombstone beats every older version and travels both ways', () => {
    const gone = noneGone()
    gone.pages.a = 10
    const m = mergeSides(side({ pages: [page('a', 5)] }), side({ gone }))
    expect(m.drop.pages).toEqual(['a'])
    expect(m.ahead).toBe(false)
    // Deleted here, still in the bucket: the file is written without it
    const back = mergeSides(side({ gone }), side({ pages: [page('a', 5)] }))
    expect(back.take.pages).toEqual([])
    expect(back.ahead).toBe(true)
    // Changed after it was deleted elsewhere: the change wins
    expect(mergeSides(side({ pages: [page('a', 11)] }), side({ gone })).drop.pages).toEqual([])
  })

  it('settings go whole by their stamp; learned words of both sides are kept', () => {
    const m = mergeSides(
      side({ settings: { at: 3, value: { homeRows: 'summary' } as never }, learned: { at: 3, value: { хлеб: 'p1' } } }),
      side({ settings: { at: 8, value: { homeRows: 'compact' } as never }, learned: { at: 8, value: { сыр: 'p2' } } })
    )
    expect(m.settings?.value).toEqual({ homeRows: 'compact' })
    expect(m.learned?.value).toEqual({ хлеб: 'p1', сыр: 'p2' })
    expect(m.ahead).toBe(true) // the bucket lacks «хлеб»
  })

  it('a file of a newer format is read as far as it goes', () => {
    const f = parseFile(JSON.stringify({ ...fileOf(emptySide()), format: 2 }))
    expect(f.newer).toBe(true)
    expect(() => parseFile('{"app":"other"}')).toThrow()
  })
})

describe('the first connect', () => {
  /** A device a week in: its first run and records of its own on «Покупки» */
  function deviceData(buys: string[]): Side {
    const d = firstRun()
    const shop = d.pages.find(p => p.title === 'Покупки')!
    return { ...emptySide(), ...d, records: [...d.records, ...buys.map((text, i) => newRecord({ pageId: shop.id, text, order: i }))] }
  }

  it('the brief\'s check: two «Покупки» side by side, Входящие and Сегодня once each', () => {
    const a = deviceData(['Молоко', 'Хлеб', 'Сыр'])
    const b = deviceData(['Батарейки', 'Кофе в зёрнах'])
    const f = firstMerge(a, b)
    const after = mergeSides(f.here, b)
    const pages = [...f.here.pages.filter(p => !after.drop.pages.includes(p.id)), ...after.take.pages as typeof b.pages]
    expect(pages.filter(p => p.title === 'Покупки')).toHaveLength(2)
    expect(pages.filter(p => p.kind === 'inbox')).toHaveLength(1)
    expect(pages.filter(p => p.kind === 'today')).toHaveLength(1)
    // The untouched starter pages of this device are the bucket's: no second «Задачи» or «Быстрый старт»
    expect(pages.filter(p => p.title === 'Быстрый старт')).toHaveLength(1)
    expect(pages.filter(p => p.title === 'Задачи')).toHaveLength(1)
    expect(f.added).toEqual({ pages: 1, records: 2 })
    expect(receiptText(f.added)).toBe('Из бакета добавлено: 1 страница, 2 записи')
  })

  it('the bucket\'s untouched starter pages are this device\'s pages of the same name', () => {
    const a = deviceData(['Молоко'])
    const tasks = a.pages.find(p => p.title === 'Задачи')!
    a.records.push(newRecord({ pageId: tasks.id, text: 'Позвонить в сервис', order: 0 }))
    a.pages = a.pages.filter(p => p.title !== 'Быстрый старт')
    a.records = a.records.filter(r => !r.seed)
    const b = deviceData(['Батарейки'])
    const f = firstMerge(a, b)
    const tasksB = b.pages.find(p => p.title === 'Задачи')!
    const startB = b.pages.find(p => p.title === 'Быстрый старт')!
    expect(Object.keys(f.retired.pages)).toContain(tasksB.id)
    expect(Object.keys(f.retired.pages)).not.toContain(startB.id)
    // Покупки has the person's records on both sides: both stay
    expect(Object.keys(f.retired.pages)).not.toContain(b.pages.find(p => p.title === 'Покупки')!.id)
    // B's Покупки and its «Быстрый старт» (this device has none) come; Задачи and Идеи do not
    expect(f.added).toEqual({ pages: 2, records: 1 })
  })

  it('Входящие\'s records move under the bucket\'s Входящие', () => {
    const a = deviceData([])
    const b = deviceData([])
    const inboxA = a.pages.find(p => p.kind === 'inbox')!
    const inboxB = b.pages.find(p => p.kind === 'inbox')!
    a.records.push(newRecord({ pageId: inboxA.id, text: 'Позвонить в сервис', order: 0 }))
    const f = firstMerge(a, b)
    expect(f.dropped.pages).toContain(inboxA.id)
    expect(f.here.records.find(r => r.text === 'Позвонить в сервис')?.pageId).toBe(inboxB.id)
  })

  it('an empty bucket and a device connected before add nothing', () => {
    const a = deviceData(['Молоко'])
    expect(receiptText(firstMerge(a, emptySide()).added)).toBe('Синхронизация включена')
    expect(firstMerge(a, a).added).toEqual({ pages: 0, records: 0 })
  })
})

describe('what Настройки say', () => {
  const now = Date.UTC(2026, 9, 28, 12)
  const base = { on: true, at: now, offline: false, pending: 0, error: null, newer: false, waitingSince: null }
  it('the state line and the sign', () => {
    expect(stateText({ ...base, on: false }, now).text).toBe('Выключена')
    expect(stateText(base, now + 20000).text).toBe('Синхронизировано · только что')
    expect(stateText(base, now + 5 * 60000).text).toBe('Синхронизировано · 5 мин назад')
    expect(stateText({ ...base, offline: true, pending: 3 }, now).text).toBe('Ждёт сети · 3 изменения не отправлены')
    expect(stateText({ ...base, offline: true, pending: 1 }, now).text).toBe('Ждёт сети · 1 изменение не отправлено')
    expect(stateText({ ...base, offline: true, pending: 5 }, now).text).toBe('Ждёт сети · 5 изменений не отправлены')
    expect(stateText({ ...base, error: 'key' }, now)).toEqual({ text: 'Ошибка: ключ больше не подходит', warn: true })
    expect(stateText({ ...base, newer: true }, now)).toEqual({ text: 'Только чтение: нужна новая версия', warn: true })
    expect(signOf({ ...base, offline: true, pending: 1, waitingSince: now - 9 * 60000 }, now)).toBe(null)
    expect(signOf({ ...base, offline: true, pending: 1, waitingSince: now - 11 * 60000 }, now)).toBe('wait')
    expect(signOf({ ...base, error: 'reach' }, now)).toBe('warn')
  })
})

describe('two devices on one bucket', () => {
  it('«Подключить» checks first: a wrong key, no access and an unreachable bucket save nothing', async () => {
    const a = await device()
    expect(await a.cloud.connect({ ...FORM, secret: 'YCPbad' })).toEqual({ ok: false, reason: 'key' })
    expect(await a.cloud.connect({ ...FORM, bucket: 'noaccess-test' })).toEqual({ ok: false, reason: 'access' })
    expect(await a.cloud.connect({ ...FORM, bucket: 'cerulean-jos' })).toEqual({ ok: false, reason: 'reach' })
    expect(a.data.cloud).toBe(null)
    expect(s3.objects.has(`cerulean-test/${DATA_KEY}`)).toBe(false)
  })

  it('connects, merges, and changes, deletions and settings go both ways', async () => {
    const a = await device()
    const shopA = pageNamed(a.data, 'Покупки')[0]!
    for (const text of ['Молоко', 'Хлеб', 'Сыр']) a.data.addRecord({ pageId: shopA.id, text })
    expect(await a.cloud.connect(FORM)).toEqual({ ok: true, text: 'Синхронизация включена' })
    expect(a.cloud.state(Date.now()).text).toBe('Синхронизировано · только что')

    const b = await device()
    const shopB = b.on(() => pageNamed(b.data, 'Покупки')[0]!)
    b.on(() => ['Батарейки', 'Кофе в зёрнах'].forEach(text => b.data.addRecord({ pageId: shopB.id, text })))
    expect(await b.on(() => b.cloud.connect(FORM))).toEqual({ ok: true, text: 'Из бакета добавлено: 1 страница, 3 записи' })
    expect(pageNamed(b.data, 'Покупки')).toHaveLength(2)
    expect(b.data.livePages.filter(p => p.kind === 'inbox')).toHaveLength(1)

    // A takes what B added
    await a.on(() => a.cloud.roundTrip())
    expect(pageNamed(a.data, 'Покупки')).toHaveLength(2)
    expect(a.data.livePages.length).toBe(b.data.livePages.length)

    // A record added on A shows on B; a deletion goes and does not come back
    const rec = a.on(() => a.data.addRecord({ pageId: shopA.id, text: 'Яйца' }))
    await a.on(() => a.cloud.roundTrip())
    await b.on(() => b.cloud.roundTrip())
    expect(b.data.records[rec.id]?.text).toBe('Яйца')
    a.on(() => a.data.purgeRecords([rec.id]))
    await a.on(() => a.cloud.roundTrip())
    await b.on(() => b.cloud.roundTrip())
    expect(b.data.records[rec.id]).toBeUndefined()
    await b.on(() => b.cloud.roundTrip())
    await a.on(() => a.cloud.roundTrip())
    expect(a.data.records[rec.id]).toBeUndefined()

    // Edited on both while B is offline: the later edit wins whole on both
    const milk = Object.values(a.data.records).find(r => r.text === 'Молоко')!
    b.on(() => b.data.updateRecord(milk.id, { text: 'Молоко 2,5%' }))
    await new Promise(r => setTimeout(r, 5))
    a.on(() => a.data.updateRecord(milk.id, { text: 'Молоко 3,2%' }))
    await a.on(() => a.cloud.roundTrip())
    await b.on(() => b.cloud.roundTrip())
    expect(b.data.records[milk.id]?.text).toBe('Молоко 3,2%')

    // Appearance follows: Главная's mode changed on A is B's after its next round trip
    a.on(() => a.data.setSettings({ homeRows: 'compact' }))
    await a.on(() => a.cloud.roundTrip())
    await b.on(() => b.cloud.roundTrip())
    expect(b.data.settings.homeRows).toBe('compact')

    // The file never holds a key: neither the bucket's nor the model's
    a.on(() => a.data.setSettings({ apiKey: 'sk-made-up-model-key' }))
    a.on(() => a.data.setSettings({ homeRows: 'summary' }))
    await a.on(() => a.cloud.roundTrip())
    const body = s3.objects.get(`cerulean-test/${DATA_KEY}`)!.body
    expect(body).not.toContain(KEY.secret)
    expect(body).not.toContain(KEY.keyId)
    expect(body).not.toContain('sk-made-up-model-key')
    expect(toJSON(a.data.snapshot())).not.toContain(KEY.secret)
  })

  it('a device with its own pages joins a bucket of a new device: no second «Задачи»', async () => {
    const b = await device()
    const shopB = pageNamed(b.data, 'Покупки')[0]!
    b.data.addRecord({ pageId: shopB.id, text: 'Батарейки' })
    await b.cloud.connect(FORM)
    const tasksB = pageNamed(b.data, 'Задачи')[0]!

    const a = await device({ demo: true })
    const tasksA = a.on(() => pageNamed(a.data, 'Задачи')[0]!)
    expect(a.data.recordsOf(tasksA.id).length).toBeGreaterThan(0)
    await a.on(() => a.cloud.connect(FORM))
    expect(pageNamed(a.data, 'Задачи').map(p => p.id)).toEqual([tasksA.id])
    expect(pageNamed(a.data, 'Покупки')).toHaveLength(2)

    // B's empty Задачи goes, A's comes in its place
    await b.on(() => b.cloud.roundTrip())
    expect(pageNamed(b.data, 'Задачи').map(p => p.id)).toEqual([tasksA.id])
    expect(b.data.pages[tasksB.id]).toBeUndefined()
    await a.on(() => a.cloud.roundTrip())
    expect(pageNamed(a.data, 'Задачи')).toHaveLength(1)
  })

  it('a round trip with nothing new reads only the ETag and writes nothing', async () => {
    const a = await device()
    await a.cloud.connect(FORM)
    await a.cloud.roundTrip()
    s3.log.length = 0
    await a.cloud.roundTrip()
    expect(s3.log.map(r => r.method)).toEqual(['GET'])
    expect(s3.log[0]!.headers['if-none-match']).toBeTruthy()
  })

  it('a round trip asked before connecting does not block the ones after', async () => {
    const a = await device()
    // On start nothing is connected: that run ends at once
    await a.cloud.roundTrip()
    await a.cloud.connect(FORM)
    // The round trip connecting schedules, then one asked here
    await a.cloud.roundTrip()
    s3.log.length = 0
    await a.cloud.roundTrip()
    expect(s3.log.map(r => r.method)).toEqual(['GET'])
  })

  it('offline: changes wait and are counted; three failures of the key stop sync', async () => {
    const a = await device()
    await a.cloud.connect(FORM)
    a.cloud.online = false
    const page = pageNamed(a.data, 'Покупки')[0]!
    for (const text of ['Молоко', 'Хлеб', 'Сыр']) a.data.addRecord({ pageId: page.id, text })
    expect(a.cloud.state(Date.now()).text).toBe('Ждёт сети · 3 изменения не отправлены')
    a.cloud.online = true
    await a.cloud.roundTrip()
    expect(a.cloud.pending.count).toBe(0)

    // The key was revoked: one or two failures show nothing, the third stops sync
    s3 = fakeS3({})
    vi.stubGlobal('fetch', s3.fetch)
    a.data.addRecord({ pageId: page.id, text: 'Яйца' })
    await a.cloud.roundTrip()
    await a.cloud.roundTrip()
    expect(a.data.cloud?.error).toBe(null)
    await a.cloud.roundTrip()
    expect(a.data.cloud?.error).toBe('key')
    expect(a.cloud.state(Date.now())).toEqual({ text: 'Ошибка: ключ больше не подходит', warn: true })
    expect(a.cloud.working).toBe(false)
  })

  it('«Отключить» keeps everything here and in the bucket; «Отменить» brings the same key back', async () => {
    const a = await device()
    await a.cloud.connect(FORM)
    const pages = a.data.livePages.length
    const undo = a.cloud.disconnect()
    expect(a.data.cloud).toBe(null)
    expect(a.data.livePages.length).toBe(pages)
    expect(s3.objects.has(`cerulean-test/${DATA_KEY}`)).toBe(true)
    undo()
    expect(a.data.cloud?.bucket).toBe('cerulean-test')
    // Connected again later with the key typed anew: the same things are not doubled
    a.cloud.disconnect()
    expect(await a.cloud.connect(FORM)).toEqual({ ok: true, text: 'Синхронизация включена' })
    expect(a.data.livePages.length).toBe(pages)
  })

  it('a newer format in the bucket is only read', async () => {
    const a = await device()
    s3.objects.set(`cerulean-test/${DATA_KEY}`, { body: JSON.stringify({ ...fileOf(emptySide()), format: 99 }), etag: '"n1"' })
    expect((await a.cloud.connect(FORM)).ok).toBe(true)
    expect(a.data.cloud?.newer).toBe(true)
    a.data.addRecord({ pageId: a.data.inbox.id, text: 'Не уйдёт' })
    await a.cloud.roundTrip()
    expect(s3.objects.get(`cerulean-test/${DATA_KEY}`)!.body).not.toContain('Не уйдёт')
    expect(a.cloud.state(Date.now()).text).toBe('Только чтение: нужна новая версия')
  })

  it('«Заменить всё» while connected replaces the bucket\'s copy too, and the other device follows', async () => {
    const a = await device()
    const shop = pageNamed(a.data, 'Покупки')[0]!
    const milk = a.data.addRecord({ pageId: shop.id, text: 'Молоко' })
    const file = parseSnapshot(toJSON(a.data.snapshot()))
    const bread = a.data.addRecord({ pageId: shop.id, text: 'Хлеб' })
    await a.cloud.connect(FORM)
    const b = await device()
    await b.on(() => b.cloud.connect(FORM))
    expect(b.data.records[bread.id]?.text).toBe('Хлеб')

    // The copy was saved before «Хлеб»: replacing with it deletes «Хлеб» here, in the bucket and on B
    await a.on(() => a.data.importSnapshot(file))
    expect(a.data.cloud).not.toBe(null)
    await a.on(() => a.cloud.roundTrip())
    await b.on(() => b.cloud.roundTrip())
    expect(bucketFile().records.some(r => r.id === bread.id)).toBe(false)
    expect(b.data.records[bread.id]).toBeUndefined()
    expect(b.data.records[milk.id]?.text).toBe('Молоко')
  })

  it('«Удалить всё» clears this browser and forgets the key; the bucket stays', async () => {
    const a = await device()
    await a.cloud.connect(FORM)
    await a.data.wipe()
    expect(a.data.cloud).toBe(null)
    expect(bucketFile().pages.length).toBeGreaterThan(0)
  })
})
