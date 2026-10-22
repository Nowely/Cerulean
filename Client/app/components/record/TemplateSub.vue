<script setup lang="ts">
// A subitem of a template (v24, И9, И7): never tickable, so the 6px `ring` dot stands in the checkbox's slot. Its text
// is a field edited in place: Enter or leaving keeps the edit, Esc puts back what it was, and an emptied subitem goes.
// On desktop Alt+↑/↓ moves it one place (D2).
import { ref, useTemplateRef, watch } from 'vue'

const props = defineProps<{ text: string }>()
const emit = defineEmits<{ save: [text: string], remove: [], move: [by: -1 | 1, text: string] }>()

const draft = ref(props.text)
watch(() => props.text, (t) => {
  draft.value = t
})
const field = useTemplateRef<HTMLInputElement>('field')

function keep() {
  const t = draft.value.replace(/\s+/g, ' ').trim()
  if (!t) return emit('remove')
  draft.value = t
  if (t !== props.text) emit('save', t)
}
function onKey(e: KeyboardEvent) {
  if (e.isComposing) return
  if (e.key === 'Enter') {
    e.preventDefault()
    field.value?.blur()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    draft.value = props.text
    field.value?.blur()
  } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault()
    emit('move', e.key === 'ArrowUp' ? -1 : 1, draft.value.replace(/\s+/g, ' ').trim() || props.text)
  }
}

defineExpose({ focus: () => field.value?.focus() })
</script>

<template>
  <div class="mx-1 flex min-h-11 items-center rounded-chip pr-3 focus-within:bg-hover lg:mx-0 lg:min-h-10 lg:pr-1.5 lg:hover:bg-hover">
    <span
      class="flex size-11 shrink-0 items-center justify-center lg:size-9"
      aria-hidden="true"
    >
      <span class="size-1.5 rounded-full bg-ring" />
    </span>
    <input
      ref="field"
      v-model="draft"
      type="text"
      enterkeyhint="done"
      autocomplete="off"
      autocapitalize="sentences"
      aria-label="Подпункт шаблона"
      class="min-h-11 min-w-0 flex-1 bg-transparent py-1 pr-1 pl-0.5 text-record text-highlighted outline-none lg:min-h-10"
      @keydown="onKey"
      @blur="keep"
    >
  </div>
</template>
