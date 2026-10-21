<script setup lang="ts">
// A body where it shows (v23): the editor where it can be edited, drawn as text everywhere else. The text looks the
// same both ways, so nothing moves when the editor arrives. A chip at rest opens the preview.
import { onMounted, shallowRef, useTemplateRef, watch, type Component, type ShallowRef } from 'vue'
import type { BodyDoc } from '~/domain/types'
import type { BodyOwner } from '~/domain/body'
import { useDataStore } from '~/stores/data'
import { usePeek } from '~/composables/usePeek'
import BodyView from './BodyView'
import { loadEditor } from './load'

const props = withDefaults(defineProps<{
  owner: BodyOwner
  doc: BodyDoc | null
  placeholder: string
  label: string
  /** What «@» ranks by besides the line: the record's or the page's name */
  context?: string
  editable?: boolean
}>(), { context: '', editable: true })
const emit = defineEmits<{ focus: [boolean] }>()
const data = useDataStore()
const peek = usePeek()

const Editor: ShallowRef<Component | undefined> = shallowRef()
const inner = useTemplateRef<{ focus: (where?: 'start' | 'end') => void }>('inner')
/** A focus asked for before the editor is in */
const wanted = shallowRef<'start' | 'end' | null>(null)

function load() {
  if (props.editable && !Editor.value) void loadEditor().then(c => Editor.value = c)
}
onMounted(load)
watch(() => props.editable, load)

function focus(where: 'start' | 'end' = 'end') {
  if (inner.value) inner.value.focus(where)
  else {
    wanted.value = where
    load()
  }
}

function openMention(id: string) {
  if (data.records[id]) peek.peek({ kind: 'record', id })
  else if (data.pages[id]) peek.peek({ kind: 'page', id })
}

defineExpose({ focus })
</script>

<template>
  <component
    :is="Editor"
    v-if="Editor && editable"
    ref="inner"
    :owner="owner"
    :doc="doc"
    :placeholder="placeholder"
    :label="label"
    :context="context"
    :autofocus="wanted"
    @focus="(v: boolean) => emit('focus', v)"
  />
  <BodyView
    v-else
    :doc="doc"
    :placeholder="editable ? placeholder : ''"
    @mention="openMention"
  />
</template>
