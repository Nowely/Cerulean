<script setup lang="ts">
// The bottom of Главная, a page and Сегодня: what was just written, then the composer. One way to say «записано»:
// a send that lands elsewhere docks its receipt, Уточнение or found card here (a send to the page itself only adds
// its fresh row). After a send the keyboard stays up for the next record; while it is up the receipt is one 44px
// line. Sends to the same page within 30 s join one receipt. A question or an unclear record closes the keyboard,
// because its card needs a tap. A toast and a docked card never show together: the latest replaces the other.
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useToast } from '#imports'
import type { Entry, Id } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useScreen } from '~/composables/useScreen'
import AppComposer from './AppComposer.vue'
import EntryCard from '../chat/EntryCard.vue'
import ReceiptCard from '../chat/ReceiptCard.vue'

const SERIES_MS = 30_000

withDefaults(defineProps<{
  mode?: 'auto' | 'page' | 'today'
  pageId?: Id
  /** Главная on day one: the guess line says what the composer is for */
  intro?: boolean
}>(), { mode: 'auto', pageId: undefined, intro: false })
const emit = defineEmits<{ docked: [boolean] }>()

const data = useDataStore()
const ui = useUiStore()
const toast = useToast()
const { isDesktop } = useScreen()
const composer = useTemplateRef<InstanceType<typeof AppComposer>>('composer')

/** Lines sent from here, in order */
const ids = ref<Id[]>([])
const shown = ref(false)
const typing = ref(false)
/** A tap on the one-line receipt shows the card with the keyboard still up */
const opened = ref(false)

const entries = computed(() => ids.value.map(id => data.entries.find(e => e.id === id)).filter((e): e is Entry => !!e && e.kind !== 'undone'))
const last = computed(() => entries.value.at(-1))
/** The latest send and the sends before it that went to the same page, each within 30 s of the next; a move ends it */
const series = computed<Entry[]>(() => {
  const list = entries.value
  const l = last.value
  if (!l) return []
  if (l.kind !== 'routed') return [l]
  const out = [l]
  for (let i = list.length - 2; i >= 0; i--) {
    const e = list[i]!
    if (e.kind !== 'routed' || e.pageId !== l.pageId || !!e.moved !== !!l.moved || out[0]!.at - e.at > SERIES_MS) break
    out.unshift(e)
  }
  return out
})
const receipt = computed(() => last.value?.kind === 'routed' || last.value?.kind === 'offline')
/** Keyboard up on a phone: the receipt shrinks to one line so the list stays in view */
const line = computed(() => !isDesktop.value && typing.value && !opened.value && (receipt.value || last.value?.kind === 'pending'))
const docked = computed(() => shown.value && !!last.value)
watch(docked, v => emit('docked', v), { immediate: true })

function onSent(e: Entry | null) {
  if (!e) return
  ids.value = [...ids.value, e.id]
  shown.value = true
  opened.value = false
  toast.clear()
}

// A question or an unclear record needs a tap: the keyboard goes down so the card is seen
watch(() => last.value?.kind, (kind) => {
  if (kind === 'ask' || kind === 'found') composer.value?.blur()
})
watch(typing, (v) => {
  if (!v) opened.value = false
})
// A toast takes the place of the card
watch(() => ui.toastAt, () => {
  shown.value = false
})

function onUndone(e: Entry) {
  ids.value = ids.value.filter(id => id !== e.id)
  if (!entries.value.length) shown.value = false
}
</script>

<template>
  <div
    aria-live="polite"
    class="flex flex-col gap-2"
  >
    <template v-if="docked && last">
      <div
        v-if="line && last.kind === 'pending'"
        class="raised flex h-11 items-center gap-3 rounded-card bg-default px-3 text-sm text-toned shadow-float dark:ring dark:ring-inset dark:ring-line2"
        role="status"
      >
        <UIcon
          name="cer:auto"
          class="size-4.5 shrink-0"
        />Разбирается…
      </div>
      <ReceiptCard
        v-else-if="receipt"
        :key="series[0]!.id"
        :entry="last"
        :series="series"
        :line="line"
        docked
        :chat-link="mode === 'auto'"
        @open="opened = true"
        @undone="onUndone"
      />
      <div
        v-else
        class="relative"
      >
        <EntryCard
          :entry="last"
          float
        />
        <UButton
          v-if="last.kind !== 'pending'"
          icon="i-lucide-x"
          variant="ghost"
          square
          size="sm"
          aria-label="Скрыть"
          class="absolute top-1 right-1"
          @click="shown = false"
        />
      </div>
    </template>

    <AppComposer
      ref="composer"
      :mode="mode"
      :page-id="pageId"
      :intro="intro && !ids.length"
      @sent="onSent"
      @focus="v => typing = v"
    />
  </div>
</template>
