// «Войти через OpenRouter»: OAuth with PKCE, no server and no app registration. OpenRouter sends the user back
// with a code; the code and the secret kept in this tab turn into a key the user owns and pays for.
const VERIFIER = 'cerulean-openrouter-verifier'

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export async function challengeFor(verifier: string): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
}

/** Leaves for OpenRouter; it comes back to `callback` with ?code= */
export async function startOpenRouter(callback: string) {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)))
  sessionStorage.setItem(VERIFIER, verifier)
  const query = new URLSearchParams({ callback_url: callback, code_challenge: await challengeFor(verifier), code_challenge_method: 'S256' })
  window.location.assign(`https://openrouter.ai/auth?${query}`)
}

/** The key for the code OpenRouter sent back, or null when this tab did not start a sign-in */
export async function finishOpenRouter(code: string): Promise<string | null> {
  let verifier: string | null
  try {
    verifier = sessionStorage.getItem(VERIFIER)
    sessionStorage.removeItem(VERIFIER)
  } catch {
    return null
  }
  if (!verifier) return null
  const res = await fetch('https://openrouter.ai/api/v1/auth/keys', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' })
  })
  if (!res.ok) throw new Error(`OpenRouter: ${res.status}`)
  const { key } = await res.json() as { key?: string }
  if (!key) throw new Error('OpenRouter: no key')
  return key
}
