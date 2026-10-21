<script setup lang="ts">
// A mention inside the editor (v23, S3). While the body has focus a tap puts the caret right after the chip (Backspace
// then takes it whole); at rest a tap opens the preview, as any link that is not navigation, without starting to edit.
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { useDataStore } from '~/stores/data'
import { usePeek } from '~/composables/usePeek'
import MentionChip from './MentionChip.vue'

const props = defineProps(nodeViewProps)
const data = useDataStore()
const peek = usePeek()

/** Never let the browser or the editor select the chip or move focus by itself */
function down(e: MouseEvent) {
  e.preventDefault()
}

function open(e: Event) {
  e.preventDefault()
  const id = String(props.node.attrs.id ?? '')
  if (props.editor.isFocused) {
    const pos = props.getPos()
    if (typeof pos === 'number') props.editor.chain().focus().setTextSelection(pos + props.node.nodeSize).run()
    return
  }
  if (data.records[id]) peek.peek({ kind: 'record', id })
  else if (data.pages[id]) peek.peek({ kind: 'page', id })
}
</script>

<template>
  <NodeViewWrapper
    as="span"
    class="mention"
    data-type="mention"
    :data-id="node.attrs.id"
    @mousedown="down"
    @click="open"
  >
    <MentionChip
      :id="String(node.attrs.id ?? '')"
      :label="node.attrs.label"
    />
  </NodeViewWrapper>
</template>
