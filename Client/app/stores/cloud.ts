// Sync through the person's own bucket (sync delta, items 5–16). IndexedDB stays the source: a round trip reads
// `cerulean/data.json` (only when it changed, by ETag), merges it with what is here (the later version of each thing
// wins whole) and writes it back when this side has anything the bucket lacks. It runs 2 s after a change, when the
// app opens or comes back, when the network comes back and every 30 s. One tab of a browser runs it (a Web Lock).
// A failure of one try shows nothing; the same failure three times in a row stops sync and Настройки say why.
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useDataStore } from './data'
import {
  CHECK_KEY, DATA_KEY, emptySide, fileOf, firstMerge, mergeSides, parseFile, receiptText, signOf, stateText,
  type CloudMeta, type Side, type SyncError, type SyncView
} from '~/domain/bucket'
import { getObject, putObject, S3Error, YANDEX, type S3Config, type S3Fail } from '~/domain/s3'
import { uid } from '~/domain/ids'

/** A round trip waits this long after a change, so a run of edits goes in one */
const AFTER_CHANGE_MS = 2000
const EVERY_MS = 30_000
/** The same failure this many times in a row stops sync and says so (item 12) */
const STOP_AFTER = 3

/** What «Подключить» can answer besides success (item 7) */
export type ConnectFail = 'key' | 'access' | 'reach' | 'offline'

export interface SyncForm {
  bucket: string
  keyId: string
  secret: string
  /** «Другой адрес»; empty: Yandex Object Storage */
  endpoint?: string
  region?: string
}

/** The theme is kept by color-mode, outside the data store: the app hands it over */
export interface ThemeSlot {
  get: () => string
  set: (v: string) => void
}

const config = (m: Pick<CloudMeta, keyof S3Config>): S3Config => ({ endpoint: m.endpoint, region: m.region, bucket: m.bucket, keyId: m.keyId, secret: m.secret })

/** The bucket's file, or why it cannot be read: anything but Cerulean's file is a bucket that does not answer */
function read(got: { status: number, body: string }): { side: Side, newer: boolean } {
  if (got.status === 404) return { side: emptySide(), newer: false }
  try {
    return parseFile(got.body)
  } catch {
    throw new S3Error('reach', got.status, 'NotOurFile')
  }
}

export const useCloudStore = defineStore('cloud', () => {
  const data = useDataStore()
  const meta = computed(() => data.cloud)
  const on = computed(() => !!meta.value)
  const online = ref(typeof navigator === 'undefined' || navigator.onLine !== false)
  const running = ref(false)

  const pending = computed(() => meta.value ? data.pendingAfter(meta.value.synced) : { count: 0, first: null })
  const view = computed<SyncView & { waitingSince: number | null }>(() => ({
    on: on.value,
    at: meta.value?.at ?? 0,
    offline: !online.value,
    pending: pending.value.count,
    error: meta.value?.error ?? null,
    newer: meta.value?.newer ?? false,
    waitingSince: pending.value.first
  }))
  /** Connected and neither stopped by an error nor read-only: the copy reminders rest meanwhile (item 3) */
  const working = computed(() => !!meta.value && !meta.value.error && !meta.value.newer)
  const stopped = computed(() => !!meta.value && (!!meta.value.error || meta.value.newer))
  const state = (now: number) => stateText(view.value, now)
  const sign = (now: number) => signOf(view.value, now)

  // ---------- the theme ----------

  let theme: ThemeSlot | null = null
  /** The theme a round trip just set: its echo through color-mode is not a change of the person's */
  let applied: string | null = null

  function applyTheme(v: string | undefined) {
    if (!theme || !v || theme.get() === v) return
    applied = v
    theme.set(v)
  }

  function themeChanged(v: string) {
    if (v === applied) {
      applied = null
      return
    }
    applied = null
    data.touchSettings()
  }

  /** What syncs from here: the data store's side, the theme added to its settings */
  function here(): Side {
    const side = data.side()
    return theme && side.settings ? { ...side, settings: { ...side.settings, value: { ...side.settings.value, theme: theme.get() } } } : side
  }

  // ---------- writing the file ----------

  /** A service that refuses a conditional write (501) is written to plainly: the next round trips heal a lost race */
  let plainWrites = false

  async function write(cfg: S3Config, body: string, cond: { ifMatch?: string | null, ifNoneMatch?: boolean }) {
    try {
      return await putObject(cfg, DATA_KEY, body, plainWrites ? {} : cond)
    } catch (e) {
      if (!(e instanceof S3Error && e.reason === 'unsupported') || plainWrites) throw e
      plainWrites = true
      return putObject(cfg, DATA_KEY, body)
    }
  }

  // ---------- a round trip ----------

  /** Bumped whenever the connection changes: what a round trip of an older one brings is left out */
  let session = 0
  let fails: { reason: S3Fail | null, n: number } = { reason: null, n: 0 }
  let again = false

  function patch(p: Partial<CloudMeta>) {
    if (data.cloud) data.setCloud({ ...data.cloud, ...p })
  }

  async function once(m: CloudMeta, mine: number) {
    const cfg = config(m)
    const mark = data.clockNow()
    const got = await getObject(cfg, DATA_KEY, m.etag)
    if (mine !== session || !data.cloud) return
    let newer = m.newer
    let etag = got.etag
    let synced = mark
    let ahead: boolean
    if (got.status === 304) {
      ahead = data.pendingAfter(m.synced, true).count > 0
    } else {
      const there = read(got)
      newer = there.newer
      const quiet = data.clockNow() === mark
      const merged = mergeSides(here(), there.side)
      applyTheme(data.takeRemote(merged)?.theme)
      // Nothing was changed here meanwhile: what the bucket brought is in, whatever the other device's clock said
      if (quiet) synced = data.clockNow()
      ahead = merged.ahead
    }
    // A newer format is only read: changes here stay on the device (item 14)
    if (ahead && !newer) {
      const at = data.clockNow()
      etag = (await write(cfg, JSON.stringify(fileOf(here())), got.status === 404 ? { ifNoneMatch: true } : { ifMatch: etag })).etag
      if (mine !== session || !data.cloud) return
      synced = at
    }
    patch({ etag, at: Date.now(), synced, error: null, newer })
  }

  function failed(e: unknown) {
    const reason: S3Fail = e instanceof S3Error ? e.reason : 'reach'
    if (reason === 'offline') {
      online.value = false
      return
    }
    // Someone wrote between the read and the write: read again at once
    if (reason === 'conflict') {
      again = true
      return
    }
    fails = fails.reason === reason ? { reason, n: fails.n + 1 } : { reason, n: 1 }
    if (fails.n >= STOP_AFTER && data.cloud?.error === null) {
      const error: SyncError = reason === 'key' || reason === 'access' ? reason : 'reach'
      patch({ error })
    }
  }

  /** A key that stopped working or lost its rights waits for «Ввести ключ заново»; a bucket that does not answer is tried again */
  const waitsForKey = () => data.cloud?.error === 'key' || data.cloud?.error === 'access'

  let current: Promise<void> | null = null

  /** One round trip at a time; asked during one, it runs once more right after. Resolves when they are through */
  function roundTrip(): Promise<void> {
    if (current) {
      again = true
      return current
    }
    const run = async () => {
      do {
        again = false
        const m = data.cloud
        if (!m || waitsForKey() || !online.value) return
        running.value = true
        const mine = session
        try {
          await once(m, mine)
          fails = { reason: null, n: 0 }
        } catch (e) {
          if (mine === session) failed(e)
        } finally {
          running.value = false
        }
      } while (again)
    }
    // Cleared after the assignment even when the run ends at once (nothing connected): `.finally` waits a microtask
    current = run().finally(() => {
      current = null
    })
    return current
  }

  // ---------- when ----------

  let soon: ReturnType<typeof setTimeout> | undefined
  /** One tab of this browser runs the round trips; the others take what it brings through IndexedDB */
  let leader = false

  function schedule(ms = AFTER_CHANGE_MS) {
    clearTimeout(soon)
    if (!data.cloud) return
    soon = setTimeout(() => {
      if (leader) void roundTrip()
    }, ms)
  }

  let started = false
  /** Starts the triggers once the data is read (app.vue) */
  function start(slot?: ThemeSlot) {
    if (started) return
    started = true
    if (slot) {
      theme = slot
      watch(slot.get, v => themeChanged(v))
    }
    data.onChange(() => schedule())
    // Connected in another tab: this one runs it from now on if it leads
    watch(on, (v) => {
      if (v && leader) schedule(0)
    })
    if (typeof window === 'undefined') {
      leader = true
      return
    }
    window.addEventListener('online', () => {
      online.value = true
      if (leader) void roundTrip()
    })
    window.addEventListener('offline', () => {
      online.value = false
    })
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && leader) void roundTrip()
    })
    setInterval(() => {
      if (leader && document.visibilityState !== 'hidden') void roundTrip()
    }, EVERY_MS)
    const lead = () => {
      leader = true
      void roundTrip()
    }
    const locks = (navigator as Navigator & { locks?: LockManager }).locks
    if (locks?.request) void locks.request('cerulean-sync', () => new Promise<void>(() => lead())).catch(lead)
    else lead()
  }

  // ---------- Настройки ----------

  /**
   * «Подключить» (items 7, 8): a small test object is written and read back with its ETag; nothing is kept until that
   * works. Then the first connect merges both sides with no question and the receipt says what came from the bucket
   */
  async function connect(form: SyncForm): Promise<{ ok: true, text: string } | { ok: false, reason: ConnectFail }> {
    const cfg: S3Config = {
      endpoint: form.endpoint?.trim() || YANDEX.endpoint,
      region: form.region?.trim() || YANDEX.region,
      bucket: form.bucket.trim(),
      keyId: form.keyId.trim(),
      secret: form.secret.trim()
    }
    if (!online.value) return { ok: false, reason: 'offline' }
    const device = data.cloud?.device ?? uid('d')
    let got: Awaited<ReturnType<typeof getObject>>
    let there: ReturnType<typeof read>
    try {
      const probe = JSON.stringify({ app: 'cerulean', device, at: Date.now() })
      await putObject(cfg, CHECK_KEY, probe)
      const back = await getObject(cfg, CHECK_KEY)
      if (back.status !== 200 || back.body !== probe) throw new S3Error('reach', back.status, 'ProbeLost')
      got = await getObject(cfg, DATA_KEY)
      there = read(got)
    } catch (e) {
      const reason = e instanceof S3Error ? e.reason : 'reach'
      return { ok: false, reason: reason === 'key' || reason === 'access' || reason === 'offline' ? reason : 'reach' }
    }
    const mine = ++session
    clearTimeout(soon)
    const first = firstMerge(here(), there.side)
    data.adopt(first)
    const merged = mergeSides(here(), there.side)
    applyTheme(data.takeRemote(merged)?.theme)
    const at = data.clockNow()
    fails = { reason: null, n: 0 }
    data.setCloud({ ...cfg, device, etag: got.etag, at: Date.now(), synced: merged.ahead && !there.newer ? 0 : at, error: null, newer: there.newer })
    if (merged.ahead && !there.newer) {
      try {
        const put = await write(cfg, JSON.stringify(fileOf(here())), got.status === 404 ? { ifNoneMatch: true } : { ifMatch: got.etag })
        if (mine === session) patch({ etag: put.etag, synced: at, at: Date.now() })
      } catch (e) {
        // The check passed a moment ago: the next round trips send it
        if (mine === session) failed(e)
        patch({ etag: null })
        schedule()
      }
    }
    return { ok: true, text: receiptText(first.added) }
  }

  /** «Синхронизировать сейчас» */
  async function now() {
    await roundTrip()
  }

  /**
   * «Отключить» (item 10): at once; local data stays and nothing in the bucket is deleted. Returns «Отменить», which
   * brings back the same bucket and key while the notice is up; after that the key is forgotten here
   */
  function disconnect(): () => void {
    const was = data.cloud
    session++
    clearTimeout(soon)
    data.setCloud(null)
    return () => {
      if (data.cloud || !was) return
      session++
      data.setCloud(was)
      void roundTrip()
    }
  }

  return { meta, on, online, running, view, working, stopped, pending, state, sign, start, connect, now, disconnect, roundTrip }
})
