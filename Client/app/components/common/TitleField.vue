<script setup lang="ts">
// A page or record title edited in place: a field that grows with the text, no border (the `hover` fill on desktop).
// Enter or leaving it saves, Esc puts the old text back, spaces are tidied. A required title that is left empty
// keeps the old text. At rest the short words are glued to the next one (nb, v23 F9); in the field being typed
// in the spaces are plain again, and the saved title never holds the glue.
import { nextTick, ref, useTemplateRef, watch } from 'vue'
import { nb } from '~/domain/text'

const props = defineProps<{
  value: string
  label: string
  placeholder?: string
  required?: boolean
  /** A done record: the title is struck through */
  struck?: boolean
  /** The keyboard's Enter key: «next» where Enter goes on to the page's text or first record */
  enterKey?: 'done' | 'next'
}>()
const emit = defineEmits<{ save: [value: string], focus: [boolean], draft: [value: string], enter: [] }>()

const unglue = (s: string) => s.replace(/\u00a0/g, ' ')
const draft = ref(nb(props.value))
const field = useTemplateRef<HTMLTextAreaElement>('field')
let editing = false
watch(() => props.value, (v) => {
  if (!editing) draft.value = nb(v)
})
watch(draft, v => emit('draft', unglue(v)))

function onFocus() {
  editing = true
  // Same length, so the caret stays where the tap put it
  const el = field.value
  if (el && draft.value !== unglue(draft.value)) {
    const [from, to] = [el.selectionStart, el.selectionEnd]
    draft.value = unglue(draft.value)
    void nextTick(() => el.setSelectionRange(from, to))
  }
  emit('focus', true)
}
function onBlur() {
  if (editing) {
    const t = draft.value.replace(/\s+/g, ' ').trim()
    if (!t && props.required) draft.value = nb(props.value)
    else {
      draft.value = nb(t)
      if (t !== props.value) emit('save', t)
    }
  }
  editing = false
  emit('focus', false)
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.isComposing) {
    e.preventDefault()
    field.value?.blur()
    emit('enter')
  } else if (e.key === 'Escape') {
    e.stopPropagation()
    editing = false
    draft.value = nb(props.value)
    field.value?.blur()
  }
}

defineExpose({ focus: () => field.value?.focus() })
</script>

<template>
  <div class="grid min-w-0 flex-1 rounded-item lg:-mx-1.5 lg:px-1.5 lg:hover:bg-hover lg:has-focus:bg-transparent">
    <span
      class="invisible col-start-1 row-start-1 whitespace-pre-wrap break-words text-title"
      aria-hidden="true"
    >{{ draft || placeholder }}&#8203;</span>
    <textarea
      ref="field"
      v-model="draft"
      rows="1"
      :enterkeyhint="enterKey ?? 'done'"
      :aria-label="label"
      :placeholder="placeholder"
      class="col-start-1 row-start-1 min-w-0 resize-none overflow-hidden bg-transparent text-title caret-accent outline-none placeholder:font-medium placeholder:text-placeholder-lg"
      :class="struck ? 'text-dimmed line-through' : 'text-highlighted'"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKey"
    />
  </div>
</template>
