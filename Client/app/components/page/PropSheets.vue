<script setup lang="ts">
// The one sheet of «Свойства» and «Свойство» (a dialog on desktop), opened through usePropSheets. The list leads to
// the editor in the same sheet. «Готово» and «Отмена» go back where the editor was opened: the list, or once the
// sheet has closed, «Настроить вид» or the record. The scrim, Escape and a swipe close everything; no × (v23, F18).
import { computed, ref, useTemplateRef, watch } from 'vue'
import type { Id, PropDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { usePropSheets } from '~/composables/usePropSheets'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'
import PropList from './PropList.vue'
import PropEditor from './PropEditor.vue'

const data = useDataStore()
const { sheet } = usePropSheets()
const page = computed(() => sheet.value ? data.pages[sheet.value.pageId] : undefined)
const editing = computed(() => sheet.value?.screen === 'edit')
const isNew = computed(() => editing.value && !sheet.value?.propId)
const confirming = ref(false)
const editor = useTemplateRef<InstanceType<typeof PropEditor>>('editor')

const open = ref(false)
watch(sheet, (s) => {
  if (s) open.value = true
  confirming.value = false
})
// Gone with its page (deleted elsewhere): nothing left to show
watch(page, (p) => {
  if (sheet.value && (!p || p.deletedAt)) open.value = false
})

let after: (() => void) | null = null

function back(created: PropDef | null = null) {
  const s = sheet.value
  if (!s) return
  editor.value?.tidy()
  if (s.screen === 'edit' && s.from === 'list') {
    sheet.value = { ...s, screen: 'list', propId: null, type: undefined }
    return
  }
  after = () => s.onBack?.(created)
  open.value = false
}

function created(prop: PropDef) {
  sheet.value?.onCreate?.(prop)
  back(prop)
}

function edit(id: Id) {
  if (sheet.value) sheet.value = { ...sheet.value, screen: 'edit', propId: id, from: 'list' }
}

function create() {
  if (sheet.value) sheet.value = { ...sheet.value, screen: 'edit', propId: null, from: 'list', type: undefined }
}

watch(open, (v) => {
  if (!v) editor.value?.tidy()
})

function closed() {
  if (open.value) return
  const run = after
  after = null
  sheet.value = null
  run?.()
}
</script>

<template>
  <AdaptiveOverlay
    v-model:open="open"
    :title="editing ? (isNew ? 'Новое свойство' : 'Свойство') : 'Свойства'"
    :subtitle="editing ? page?.title || 'Без названия' : 'Есть у каждой записи страницы'"
    dialog
    stacked
    @closed="closed"
  >
    <template
      v-if="editing && !isNew && !confirming"
      #close
    >
      <UButton
        color="primary"
        variant="ghost"
        size="lg"
        class="px-2.5 font-medium lg:h-8 lg:text-sm"
        @click="back()"
      >
        Готово
      </UButton>
    </template>
    <template v-if="page && sheet">
      <PropEditor
        v-if="editing"
        ref="editor"
        :key="sheet.propId ?? 'new'"
        v-model:confirming="confirming"
        :page="page"
        :prop-id="sheet.propId"
        :type="sheet.type"
        @back="back()"
        @created="created"
      />
      <PropList
        v-else
        :page="page"
        @edit="edit"
        @create="create"
      />
    </template>
  </AdaptiveOverlay>
</template>
