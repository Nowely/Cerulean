// S3 straight from the browser: a static key (Yandex Object Storage, any S3-compatible service later), AWS Signature
// V4 with Web Crypto, path-style addresses. The bucket must let this origin in (CORS) and expose ETag; a browser cannot
// tell a missing bucket from a missing CORS rule, so both are one answer, `reach`.

export interface S3Config {
  /** Host only: storage.yandexcloud.net */
  endpoint: string
  region: string
  bucket: string
  keyId: string
  secret: string
}

/** What «Другой адрес» holds while it is closed */
export const YANDEX = { endpoint: 'storage.yandexcloud.net', region: 'ru-central1' } as const

/**
 * Why a request failed: `key` the ID or the secret do not fit, `access` the key has no rights on the bucket, `reach`
 * nothing readable came back (no bucket, no CORS rule, ETag not exposed, the service failed), `offline` no network,
 * `conflict` someone wrote first (If-Match), `unsupported` the service refused a conditional write
 */
export type S3Fail = 'key' | 'access' | 'reach' | 'offline' | 'conflict' | 'unsupported'

export class S3Error extends Error {
  constructor(public reason: S3Fail, public status = 0, public code = '') {
    super(code || reason)
    this.name = 'S3Error'
  }
}

const KEY_CODES = new Set(['InvalidAccessKeyId', 'SignatureDoesNotMatch', 'AuthorizationHeaderMalformed', 'InvalidToken'])
const ACCESS_CODES = new Set(['AccessDenied', 'AllAccessDisabled', 'AccountProblem'])

/** The S3 answer's `<Code>` read into a reason */
export function failOf(status: number, body: string): S3Error {
  const code = /<Code>([^<]+)<\/Code>/.exec(body)?.[1] ?? ''
  if (KEY_CODES.has(code)) return new S3Error('key', status, code)
  if (ACCESS_CODES.has(code)) return new S3Error('access', status, code)
  if (status === 412) return new S3Error('conflict', status, code)
  if (status === 501 || code === 'NotImplemented') return new S3Error('unsupported', status, code)
  if (status === 403) return new S3Error('access', status, code)
  return new S3Error('reach', status, code)
}

// ---------- Signature V4 ----------

const enc = new TextEncoder()

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256(data: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(data)))
}

async function hmac(key: BufferSource, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', k, enc.encode(data))
}

/** RFC 3986 the way S3 wants it: every byte but unreserved ones, `/` kept in a path */
function encode(s: string, path = false): string {
  return [...enc.encode(s)].map((b) => {
    const c = String.fromCharCode(b)
    return /[A-Za-z0-9\-._~]/.test(c) || (path && c === '/') ? c : `%${b.toString(16).toUpperCase().padStart(2, '0')}`
  }).join('')
}

export interface Signable {
  method: string
  url: URL
  /** Every header here is signed; `host` is added from the URL */
  headers: Record<string, string>
  /** Hex SHA-256 of the body */
  payload: string
}

/** The Authorization header for a request, its headers signed as given (and `host`) */
export async function authorization(req: Signable, cfg: Pick<S3Config, 'region' | 'keyId' | 'secret'>, amzDate: string): Promise<string> {
  const day = amzDate.slice(0, 8)
  const headers: Record<string, string> = { host: req.url.host }
  for (const [k, v] of Object.entries(req.headers)) headers[k.toLowerCase()] = v.trim().replace(/\s+/g, ' ')
  const names = Object.keys(headers).sort()
  const query = [...req.url.searchParams].map(([k, v]) => [encode(k), encode(v)]).sort(([a], [b]) => a! < b! ? -1 : a! > b! ? 1 : 0)
  const canonical = [
    req.method,
    encode(decodeURIComponent(req.url.pathname), true),
    query.map(([k, v]) => `${k}=${v}`).join('&'),
    names.map(n => `${n}:${headers[n]}\n`).join(''),
    names.join(';'),
    req.payload
  ].join('\n')
  const scope = `${day}/${cfg.region}/s3/aws4_request`
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256(canonical)].join('\n')
  let key: ArrayBuffer = await hmac(enc.encode(`AWS4${cfg.secret}`), day)
  for (const part of [cfg.region, 's3', 'aws4_request']) key = await hmac(key, part)
  const signature = hex(await hmac(key, toSign))
  return `AWS4-HMAC-SHA256 Credential=${cfg.keyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`
}

/** 20130524T000000Z */
export function amzDateOf(t: Date): string {
  return t.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// ---------- requests ----------

export function objectUrl(cfg: Pick<S3Config, 'endpoint' | 'bucket'>, key: string): URL {
  const host = cfg.endpoint.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  return new URL(`https://${host}/${encode(cfg.bucket)}/${encode(key, true)}`)
}

interface Sent {
  status: number
  body: string
  etag: string | null
}

async function send(cfg: S3Config, method: 'GET' | 'PUT', key: string, opts: { body?: string, headers?: Record<string, string> } = {}): Promise<Sent> {
  const url = objectUrl(cfg, key)
  const body = opts.body ?? ''
  const payload = await sha256(body)
  const amzDate = amzDateOf(new Date())
  const signed = { 'x-amz-content-sha256': payload, 'x-amz-date': amzDate }
  const auth = await authorization({ method, url, headers: signed, payload }, cfg, amzDate)
  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: { ...signed, ...opts.headers, Authorization: auth },
      body: method === 'PUT' ? body : undefined,
      cache: 'no-store',
      credentials: 'omit',
      mode: 'cors'
    })
  } catch {
    // The browser hides why: no network, no bucket (its 404 has no CORS headers) or no CORS rule
    throw new S3Error(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'reach')
  }
  return { status: res.status, body: res.status === 304 ? '' : await res.text().catch(() => ''), etag: res.headers.get('ETag') }
}

/** Reads an object; with `etag`, 304 says it is the same as then. `missing` when there is no such object yet */
export async function getObject(cfg: S3Config, key: string, etag?: string | null): Promise<{ status: 200 | 304 | 404, body: string, etag: string | null }> {
  const r = await send(cfg, 'GET', key, { headers: etag ? { 'If-None-Match': etag } : {} })
  if (r.status === 304) return { status: 304, body: '', etag: etag ?? null }
  if (r.status === 404 && /<Code>NoSuchKey<\/Code>/.test(r.body)) return { status: 404, body: '', etag: null }
  if (r.status !== 200) throw failOf(r.status, r.body)
  // Without ETag in «Expose headers» nothing can be compared: the bucket is not set up for a browser
  if (!r.etag) throw new S3Error('reach', 200, 'NoETag')
  return { status: 200, body: r.body, etag: r.etag }
}

/** Writes an object; `ifMatch` writes only over that version, `ifNoneMatch` only where there is none */
export async function putObject(cfg: S3Config, key: string, body: string, cond: { ifMatch?: string | null, ifNoneMatch?: boolean } = {}): Promise<{ etag: string | null }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (cond.ifMatch) headers['If-Match'] = cond.ifMatch
  else if (cond.ifNoneMatch) headers['If-None-Match'] = '*'
  const r = await send(cfg, 'PUT', key, { body, headers })
  if (r.status !== 200) throw failOf(r.status, r.body)
  return { etag: r.etag }
}
