// Short unique ids. crypto.randomUUID is missing on plain-http origins (a phone on the LAN), so build our own.
export function uid(prefix = ''): string {
  const rnd = new Uint32Array(2)
  globalThis.crypto.getRandomValues(rnd)
  return prefix + Date.now().toString(36) + rnd[0]!.toString(36) + rnd[1]!.toString(36).slice(0, 4)
}
