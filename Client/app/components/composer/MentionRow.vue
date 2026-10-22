<script setup lang="ts">
// The «@» row (v24, item 12; fixes 1, 2; D2, D3): no second pill, a bare row of chips in the guess line's place, starting at
// its x (15 in from the pill's edge) with the chips' bottom 8 above the pill. As many whole chips as fit, three at most:
// the glyph of the page the thing lives in and its name, at most 136 on a phone and 220 on desktop, cut with «…». «Ещё…»
// at the right end opens «Связать» with the query typed; with no match it stands alone. The dock grows while it shows and
// nothing else moves. On desktop the chip Enter takes is marked; ↑/↓ move the mark (the field takes the keys).
import { ref } from 'vue'
import type { Id } from '~/domain/types'
import type { Hit } from '~/domain/search'
import type { MentionTarget } from '~/domain/body'
import type { FieldMention } from '~/domain/mention'
import { GLYPHS } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useScreen } from '~/composables/useScreen'
import LinkPicker from '../record/LinkPicker.vue'

defineProps<{
  mention: FieldMention
  /** A record's composer: the record itself is not offered */
  ownerId?: Id
}>()
const emit = defineEmits<{ pick: [{ id: Id, name: string }], closed: [] }>()
const data = useDataStore()
const { isDesktop } = useScreen()
const more = ref(false)

const glyphOf = (t: MentionTarget) => {
  const page = t.kind === 'page' ? data.pages[t.id] : data.pages[t.pageId ?? '']
  return GLYPHS[page?.glyph ?? 'doc']
}
const where = (t: MentionTarget) => t.kind === 'record' ? `, ${data.pages[t.pageId ?? '']?.title || 'Без названия'}` : ''

function fromMore(h: Hit) {
  emit('pick', h.kind === 'page' ? { id: h.page.id, name: h.page.title } : { id: h.rec.id, name: h.rec.text })
}
</script>

<template>
  <div
    class="mb-1 flex h-11 items-start pl-3.75 lg:mb-2 lg:h-10 lg:items-end"
    role="group"
    aria-label="Упомянуть"
    data-mention-row
  >
    <div class="flex h-11 min-w-0 flex-1 flex-wrap content-start items-center gap-2 overflow-hidden pt-1 lg:h-9 lg:pt-0">
      <button
        v-for="(t, i) in mention.items"
        :key="t.id"
        type="button"
        class="flex h-9 max-w-34 min-w-0 cursor-pointer items-center gap-1.75 rounded-item pr-3 pl-2.25 text-sm text-highlighted ring ring-default ring-inset active:bg-chip-pressed dark:ring-0 dark:active:bg-chip-elev-pressed lg:max-w-55 lg:hover:bg-chip-pressed lg:dark:hover:bg-chip-elev-pressed"
        :class="isDesktop && mention.hi === i ? 'bg-chip-pressed dark:bg-chip-elev-pressed' : 'bg-chip dark:bg-chip-elev'"
        :aria-label="`Упомянуть «${t.name}»${where(t)}`"
        @mousedown.prevent
        @click="emit('pick', t)"
      >
        <UIcon
          :name="glyphOf(t)"
          class="size-3.5 shrink-0 text-toned"
        />
        <span class="min-w-0 truncate">{{ t.name }}</span>
      </button>
    </div>
    <LinkPicker
      v-model:open="more"
      :owner-id="ownerId"
      :query="mention.query"
      mention
      heading="Связать"
      @pick="fromMore"
      @closed="emit('closed')"
    >
      <button
        type="button"
        class="h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-xl pr-1 pl-3 text-15 font-medium text-accent-ink active:bg-pressed lg:h-9 lg:rounded-full lg:px-3.5 lg:hover:bg-accent-soft"
        aria-haspopup="dialog"
        :aria-expanded="more"
        @mousedown.prevent
      >
        Ещё…
      </button>
    </LinkPicker>
  </div>
</template>
