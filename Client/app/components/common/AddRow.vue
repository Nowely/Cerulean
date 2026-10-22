<script setup lang="ts">
// «+ Новая запись», «+ Подпункт», «+ Свойство» (main flow, items 11, 13, 15; Todoist's «+ Add task», Reminders' «New
// Reminder»): the last row of a list, a «+» and the action's name in muted. A tap turns it into a line with a record's
// circle and the caret: Enter adds the line and opens the next one, Enter on an empty line or Esc closes it, and tapping
// away keeps the typed words. Without `line` (`+ Свойство`) the row only says it was tapped.
// The line's field is mounted while closed (unseen), so a tap focuses it at once and a phone brings its keyboard up.
import { nextTick, ref, useTemplateRef } from 'vue'
import { capitalize } from '~/domain/text'

const props = withDefaults(defineProps<{
  label: string
  /** A tap opens a line to type in; off, the row emits `start` (the property editor) */
  line?: boolean
}>(), { line: true })
const emit = defineEmits<{ add: [text: string], start: [], open: [boolean] }>()

const open = ref(false)
const text = ref('')
const input = useTemplateRef<HTMLInputElement>('input')

function start() {
  if (!props.line) {
    emit('start')
    return
  }
  open.value = true
  emit('open', true)
  input.value?.focus()
  void nextTick(() => input.value?.focus())
}
/** Adds what is typed; false when there was nothing */
function add(): boolean {
  const t = text.value.replace(/\s+/g, ' ').trim()
  text.value = ''
  if (!t) return false
  emit('add', capitalize(t))
  return true
}
function close() {
  if (!open.value) return
  open.value = false
  text.value = ''
  emit('open', false)
}
function key(e: KeyboardEvent) {
  if (e.isComposing) return
  if (e.key === 'Enter') {
    e.preventDefault()
    if (add()) return
    close()
    input.value?.blur()
  } else if (e.key === 'Escape') {
    e.stopPropagation()
    close()
    input.value?.blur()
  }
}
function blur() {
  if (!open.value) return
  add()
  close()
}

defineExpose({ start, isOpen: open })
</script>

<template>
  <div class="relative">
    <button
      v-if="!open"
      type="button"
      class="mx-1 flex min-h-11 w-[calc(100%-8px)] cursor-pointer items-center rounded-chip pr-3 pl-0.5 text-left text-base text-toned active:bg-pressed lg:mx-0 lg:min-h-10 lg:w-full lg:hover:bg-hover"
      data-add-row
      @click="start"
    >
      <span
        class="flex w-10.5 shrink-0 items-center justify-center text-dimmed"
        aria-hidden="true"
      >
        <UIcon
          name="i-lucide-plus"
          class="size-4.5"
        />
      </span>{{ label }}
    </button>
    <div
      v-if="line"
      class="mx-1 flex min-h-11 items-center rounded-chip pr-3 lg:mx-0 lg:min-h-10"
      :class="open ? '' : 'pointer-events-none absolute inset-x-0 top-0 opacity-0'"
      :aria-hidden="open ? undefined : 'true'"
      data-add-line
    >
      <span
        class="flex size-11 shrink-0 items-center justify-center lg:size-9"
        aria-hidden="true"
      >
        <span class="size-5 rounded-full border-[1.5px] border-ring" />
      </span>
      <input
        ref="input"
        v-model="text"
        class="h-11 min-w-0 flex-1 bg-transparent px-0.5 text-base text-highlighted caret-accent outline-none placeholder:text-dimmed lg:h-10"
        :placeholder="label"
        :aria-label="label"
        :tabindex="open ? undefined : -1"
        enterkeyhint="next"
        autocomplete="off"
        autocapitalize="sentences"
        @focus="!open && start()"
        @keydown="key"
        @blur="blur"
      >
    </div>
  </div>
</template>
