// A bucket in memory behind `fetch`, for the sync tests: path-style S3 with ETag, If-None-Match and If-Match. The answer
// depends on the request as on the prototype: a bucket ending «-jos» is not reached, one starting «noaccess» refuses
// the key, a secret containing «bad» does not sign. Keys here are made up; nothing leaves the process.
import { authorization } from '~/domain/s3'

export interface FakeS3 {
  objects: Map<string, { body: string, etag: string }>
  /** Every request, for asserting what was sent */
  log: { method: string, url: string, headers: Record<string, string>, body?: string }[]
  /** The next requests fail as a network error does */
  down: boolean
  fetch: typeof fetch
}

const error = (status: number, code: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?><Error><Code>${code}</Code></Error>`, { status, headers: { 'Content-Type': 'application/xml' } })

export function fakeS3(secrets: Record<string, string> = {}): FakeS3 {
  const objects = new Map<string, { body: string, etag: string }>()
  const log: FakeS3['log'] = []
  let n = 0
  const s3: FakeS3 = {
    objects,
    log,
    down: false,
    fetch: async (input, init) => {
      const url = new URL(String(input))
      const method = init?.method ?? 'GET'
      const headers = Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]))
      const body = typeof init?.body === 'string' ? init.body : undefined
      log.push({ method, url: url.href, headers, body })
      if (s3.down) throw new TypeError('Failed to fetch')
      const [, bucket = '', ...rest] = url.pathname.split('/')
      const key = decodeURIComponent(rest.join('/'))
      if (bucket.endsWith('-jos')) throw new TypeError('Failed to fetch')
      // The signature is checked against the secret the key ID was given
      const keyId = /Credential=([^/]+)\//.exec(headers.authorization ?? '')?.[1] ?? ''
      const secret = secrets[keyId]
      if (secret === undefined) return error(403, 'InvalidAccessKeyId')
      const signed = { 'x-amz-content-sha256': headers['x-amz-content-sha256']!, 'x-amz-date': headers['x-amz-date']! }
      const expected = await authorization({ method, url, headers: signed, payload: signed['x-amz-content-sha256'] }, { region: 'ru-central1', keyId, secret }, signed['x-amz-date'])
      if (expected !== headers.authorization) return error(403, 'SignatureDoesNotMatch')
      if (bucket.startsWith('noaccess')) return error(403, 'AccessDenied')
      const path = `${bucket}/${key}`
      const here = objects.get(path)
      if (method === 'GET') {
        if (!here) return error(404, 'NoSuchKey')
        if (headers['if-none-match'] === here.etag) return new Response(null, { status: 304, headers: { ETag: here.etag } })
        return new Response(here.body, { status: 200, headers: { ETag: here.etag } })
      }
      if (headers['if-match'] && headers['if-match'] !== here?.etag) return error(412, 'PreconditionFailed')
      if (headers['if-none-match'] === '*' && here) return error(412, 'PreconditionFailed')
      const etag = `"e${++n}"`
      objects.set(path, { body: body ?? '', etag })
      return new Response(null, { status: 200, headers: { ETag: etag } })
    }
  }
  return s3
}
