<script setup lang="ts">
import { ref, shallowRef, type Component } from 'vue'
import type { Rec } from '~/domain/types'
import { bodyOf, docText } from '~/domain/body'
import { useNotify } from '~/composables/useNotify'
import { loadEditor } from '../../body/load'

const props = defineProps<{ rec: Rec, readonly?: boolean }>()
const emit = defineEmits<{ open: [] }>()
const editor = shallowRef<Component>()
const editing = ref(false)
const notify = useNotify()

async function edit(event: MouseEvent) {
  if (props.readonly) return emit('open')
  const button = event.currentTarget as HTMLButtonElement
  button.focus({ preventScroll: true })
  let loaded: Component
  try {
    loaded = await loadEditor()
  } catch {
    notify('Не удалось открыть заметку. Попробуйте ещё раз')
    return
  }
  if (!button.isConnected || document.activeElement !== button) return
  editor.value = loaded
  editing.value = true
}

function onFocus(focused: boolean) {
  if (!focused) editing.value = false
}
</script>

<template>
  <component
    :is="editor"
    v-if="editing && editor"
    :owner="{ kind: 'record', id: rec.id }"
    :doc="bodyOf(rec)"
    :context="rec.text"
    :label="`Заметка — ${rec.text}`"
    placeholder="Заметка"
    autofocus="end"
    class="py-2"
    @focus="onFocus"
  />
  <button
    v-else
    type="button"
    class="block h-[43px] w-41.5 truncate text-left"
    :aria-label="readonly ? `Заметка: открыть «${rec.text}»` : `Заметка: изменить «${rec.text}»`"
    @click="edit"
  >
    {{ docText(bodyOf(rec)).replace(/\n/g, ' ') }}
  </button>
</template>
