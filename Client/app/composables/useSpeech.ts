// Dictation into the composer with the browser's own recognition. Hidden where the browser has none.
import { onBeforeUnmount, ref } from 'vue'

interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

type RecognitionCtor = new () => Recognition

function ctor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor, webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function useSpeech(onText: (text: string) => void) {
  const Ctor = ctor()
  const supported = !!Ctor
  const listening = ref(false)
  const error = ref<string | null>(null)
  let rec: Recognition | null = null

  function start(prefix = '') {
    if (!Ctor || listening.value) return
    error.value = null
    rec = new Ctor()
    rec.lang = 'ru-RU'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0]?.transcript ?? '').join('')
      onText((prefix ? `${prefix} ` : '') + text)
    }
    rec.onerror = (e) => {
      error.value = e.error === 'not-allowed' ? 'Нет доступа к микрофону' : e.error === 'network' ? 'Диктовка работает только с сетью' : null
    }
    rec.onend = () => {
      listening.value = false
      rec = null
    }
    listening.value = true
    rec.start()
  }

  function stop() {
    rec?.stop()
  }

  onBeforeUnmount(stop)
  return { supported, listening, error, start, stop }
}
