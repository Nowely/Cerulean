<script setup lang="ts">
// A page or record title edited in place: a field that grows with the text, no border (the `hover` fill on desktop).
// Enter or leaving it saves, Esc puts the old text back, spaces are tidied. A required title that is left empty
// keeps the old text.
import { ref, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  value: string
  label: string
  placeholder?: string
  required?: boolean
  /** A done record: the title is struck through */
  struck?: boolean
}>()
const emit = defineEmits<{ save: [value: string], focus: [boolean] }>()

const draft = ref(props.value)
const field = useTemplateRef<HTMLTextAreaElement>('field')
let editing = false
watch(() => props.value, (v) => {
  if (!editing) draft.value = v
})

function onFocus() {
  editing = true
  emit('focus', true)
}
function onBlur() {
  if (editing) {
    const t = draft.value.replace(/\s+/g, ' ').trim()
    if (!t && props.required) draft.value = props.value
    else {
      draft.value = t
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
  } else if (e.key === 'Escape') {
    e.stopPropagation()
    editing = false
    draft.value = props.value
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
      enterkeyhint="done"
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
