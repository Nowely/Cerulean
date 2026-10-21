<script setup lang="ts">
// What a mention shows inside its chip (v23, M4): the glyph of the page the thing lives in (muted, 14) and its live name,
// so a record and a page read alike in the text. The chip itself (`span.mention`) is drawn by BodyView or the editor
import { computed } from 'vue'
import { GLYPHS, type Id } from '~/domain/types'
import { useDataStore } from '~/stores/data'

const props = defineProps<{ id: Id, label?: string | null }>()
const data = useDataStore()

const glyph = computed(() => {
  let rec = data.records[props.id]
  while (rec?.parentId && data.records[rec.parentId]) rec = data.records[rec.parentId]
  const page = rec ? data.pages[rec.pageId] : data.pages[props.id]
  return GLYPHS[page?.glyph ?? 'doc']
})
const name = computed(() => data.nameOf(props.id, props.label ?? undefined))
</script>

<template>
  <UIcon
    :name="glyph"
    class="mention-glyph"
    aria-hidden="true"
  /><span class="mention-name">{{ name }}</span>
</template>
