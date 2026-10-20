// One clock for relative dates («сегодня, 10:00», «только что»): ticks every 30 s and when the tab comes back
import { onScopeDispose, ref } from 'vue'

const now = ref(Date.now())
let users = 0
let timer: ReturnType<typeof setInterval> | undefined

function tick() {
  now.value = Date.now()
}

export function useNow() {
  if (users++ === 0 && typeof window !== 'undefined') {
    timer = setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
  }
  onScopeDispose(() => {
    if (--users === 0) {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  })
  return now
}
