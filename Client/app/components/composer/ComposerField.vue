<script setup lang="ts">
// The composer's field (v24, item 12). Tiptap is not in the first download: until the editor is in (right after the first
// paint) this is the plain field it always was, and what was typed there carries over with the caret and the focus. The
// plain field stays until the editor has the focus, so no key typed during the change is lost. The field grows with the
// text up to five lines; the placeholder never wraps it (16px, so iOS does not zoom on focus).
import { computed, markRaw, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch, type Component } from 'vue'
import type { Id } from '~/domain/types'
import type { MentionTarget } from '~/domain/body'
import type { FieldMention } from '~/domain/mention'

defineProps<{
  label: string
  placeholder: string
  /** Whether «@» opens the row here */
  mentions: boolean
  ownerId?: Id
  /** The field's own padding (a record's composer has no chip before it) */
  fieldClass: string
}>()
const text = defineModel<string>({ required: true })
const links = defineModel<Id[]>('links', { required: true })
const emit = defineEmits<{ enter: [], focus: [boolean], multi: [boolean] }>()

interface EditorApi {
  mention: FieldMention | null
  pick: (t: { id: Id, name: string }) => void
  focus: () => void
  blur: () => void
  el: () => HTMLElement | undefined
}

let loading: Promise<Component> | null = null
const loadEditor = () => (loading ??= import('./ComposerEditor.vue').then(m => markRaw(m.default as Component), (e) => {
  loading = null
  throw e
}))

const Editor = shallowRef<Component | null>(null)
const inner = useTemplateRef<EditorApi>('inner')
const area = useTemplateRef<HTMLTextAreaElement>('area')
const mirror = useTemplateRef<HTMLElement>('mirror')
/** The editor is in and has taken over from the plain field */
const ready = ref(false)

onMounted(() => {
  void loadEditor().then((c) => {
    Editor.value = c
  })
})
// The editor mounts unseen under the plain field and takes the focus (caret at the end) before the plain field goes
function takeOver() {
  const ed = inner.value
  if (!ed || ready.value) return
  // Tiptap makes its view once mounted: until then the plain field keeps the keys
  if (!ed.el()) return void requestAnimationFrame(takeOver)
  if (document.activeElement === area.value) ed.focus()
  ready.value = true
}
watch(inner, takeOver, { flush: 'post' })

// The plain field: a hidden copy in the same grid cell gives its height
const multi = ref(false)
watch(text, () => nextTick(() => {
  const el = mirror.value
  if (!el || ready.value) return
  const css = getComputedStyle(el)
  const line = parseFloat(css.lineHeight) || 22
  const m = el.scrollHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom) > line * 1.5
  if (m !== multi.value) emit('multi', multi.value = m)
}))

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    emit('enter')
  }
}

const empty = computed(() => !text.value)

const editor = () => ready.value ? inner.value : null
defineExpose({
  mention: computed(() => editor()?.mention ?? null),
  pick: (t: MentionTarget | { id: Id, name: string }) => editor()?.pick(t),
  focus: () => editor() ? editor()!.focus() : area.value?.focus(),
  blur: () => editor() ? editor()!.blur() : area.value?.blur(),
  el: () => editor()?.el() ?? area.value ?? undefined
})
</script>

<template>
  <div class="relative grid min-w-0 flex-1">
    <template v-if="Editor">
      <component
        :is="Editor"
        ref="inner"
        v-model="text"
        v-model:links="links"
        :label="label"
        :placeholder="placeholder"
        :mentions="mentions"
        :owner-id="ownerId"
        :field-class="fieldClass"
        class="col-start-1 row-start-1"
        :class="{ 'opacity-0': !ready }"
        :aria-hidden="ready ? undefined : 'true'"
        @enter="emit('enter')"
        @focus="(v: boolean) => emit('focus', v)"
        @multi="(v: boolean) => emit('multi', v)"
      />
      <span
        v-if="empty && ready"
        class="pointer-events-none col-start-1 row-start-1 truncate text-input leading-5.5 text-dimmed"
        :class="fieldClass"
        aria-hidden="true"
      >{{ placeholder }}</span>
    </template>
    <template v-if="!ready">
      <span
        ref="mirror"
        class="invisible col-start-1 row-start-1 max-h-32 overflow-hidden whitespace-pre-wrap break-words text-input leading-5.5"
        :class="fieldClass"
        aria-hidden="true"
      >{{ text }}&#8203;</span>
      <textarea
        ref="area"
        v-model="text"
        rows="1"
        enterkeyhint="send"
        autocomplete="off"
        autocapitalize="sentences"
        :placeholder="placeholder"
        :aria-label="label"
        class="no-scrollbar col-start-1 row-start-1 max-h-32 min-w-0 resize-none overflow-y-auto bg-transparent text-input leading-5.5 text-highlighted outline-none placeholder:truncate placeholder:text-dimmed"
        :class="fieldClass"
        @keydown="onKey"
        @focus="emit('focus', true)"
        @blur="emit('focus', false)"
      />
    </template>
  </div>
</template>
