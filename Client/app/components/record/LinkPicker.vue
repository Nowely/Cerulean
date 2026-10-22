<script setup lang="ts">
// «Связать»: find a record or a page and tick it to link it; tick again to undo.
// Nothing typed: what is linked now, then what was opened lately.
// A mention in a body is a link too (v23, Q3): its ✓ row says «Книги · упомянуто в тексте», and unticking it turns the
// chip into plain words (the row stays until the sheet closes; a second tap makes a hand link). «Ещё…» in the editing
// bar opens it to mention (`mention`): a row puts the chip at the caret and the sheet closes back to the text.
import { computed, ref, watch } from 'vue'
import type { Id, Rec } from '~/domain/types'
import type { Hit } from '~/domain/search'
import { recent, search } from '~/domain/search'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { useScreen } from '~/composables/useScreen'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'
import PageTile from '../common/PageTile.vue'

const props = defineProps<{
  /** The record whose links these are; a page's note mentions without one */
  rec?: Rec
  /** To mention: a row picks instead of ticking */
  mention?: boolean
  /** What the field starts with (the words typed after «@») */
  query?: string
  /** The body's owner, left out of the rows */
  ownerId?: Id
  /** The composer's «@» row opens it as «Связать» (v24, item 12); the editing bar's «Ещё…» as «Упомянуть» */
  heading?: string
  /** Desktop: where it stands when it has no button of its own (the record's «⋯») */
  anchor?: HTMLElement | null
}>()
const emit = defineEmits<{ pick: [Hit], closed: [] }>()
const data = useDataStore()
const now = useNow()
// On a phone the keyboard would cover the lists the sheet opens to show (MobileLink); desktop types at once
const { isDesktop } = useScreen()
const open = defineModel<boolean>('open', { default: false })
const q = ref('')
const idOf = (h: Hit) => h.kind === 'page' ? h.page.id : h.rec.id
const selfId = computed(() => props.rec?.id ?? props.ownerId)
const linked = computed(() => new Set(props.rec && !props.mention ? data.linksOf(props.rec.id).map(idOf) : []))
/** A ✓ row a mention made */
const byText = (h: Hit) => !!props.rec && linked.value.has(idOf(h)) && data.mentioned(props.rec.id, idOf(h))

// The lists hold still while open: an unticked link stays in place to be ticked back
const before = ref<Hit[]>([])
watch(open, (v) => {
  if (!v) return
  q.value = props.query ?? ''
  before.value = props.rec ? data.linksOf(props.rec.id) : []
})

function choose(h: Hit) {
  if (props.mention) {
    emit('pick', h)
    open.value = false
  } else if (props.rec) {
    data.toggleLink(props.rec.id, idOf(h))
  }
}

const groups = computed(() => {
  const own = (h: Hit) => idOf(h) !== selfId.value
  if (q.value.trim()) {
    const hits = search(q.value, data.livePages, data.liveRecords, { titlesOnly: true, sectionId: null }).filter(own).slice(0, 30)
    return hits.length ? [{ label: '', hits }] : []
  }
  // A few of the user's own pages, not Входящие or Сегодня, nor the page this record is on (MobileLink)
  const was = new Set(before.value.map(idOf))
  const lately = recent(data.livePages, data.liveRecords, now.value, 16).flatMap(g => g.hits)
    .filter(h => own(h) && !was.has(idOf(h)) && !(h.kind === 'page' && (h.page.kind !== 'page' || h.page.id === props.rec?.pageId)))
    .slice(0, 4)
  return [
    { label: 'Связано', hits: before.value },
    { label: 'Открыто недавно', hits: lately }
  ].filter(g => g.hits.length)
})
</script>

<template>
  <AdaptiveOverlay
    v-model:open="open"
    :title="heading ?? (mention ? 'Упомянуть' : 'Связать')"
    :align="mention ? 'end' : 'start'"
    :anchor="anchor"
    @closed="emit('closed')"
  >
    <template #trigger>
      <slot />
    </template>
    <div class="px-2 pt-1">
      <UInput
        v-model="q"
        icon="i-lucide-search"
        variant="soft"
        size="lg"
        placeholder="Страницы и записи"
        :aria-label="mention ? 'Найти, что упомянуть' : 'Найти, что связать'"
        class="w-full"
        :autofocus="isDesktop || mention"
      />
    </div>
    <ul
      class="pt-1"
      aria-label="Что связать"
    >
      <template
        v-for="g in groups"
        :key="g.label"
      >
        <li
          v-if="g.label"
          class="px-3 pt-3 pb-1 text-cap text-toned"
          role="presentation"
        >
          {{ g.label }}
        </li>
        <li
          v-for="h in g.hits"
          :key="idOf(h)"
        >
          <button
            type="button"
            class="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-chip px-3 text-left hover:bg-muted active:bg-pressed"
            :aria-pressed="mention ? undefined : linked.has(idOf(h))"
            :aria-label="mention ? `Упомянуть «${h.kind === 'page' ? h.page.title || 'Без названия' : h.rec.text}»` : undefined"
            @click="choose(h)"
          >
            <PageTile
              v-if="h.kind === 'page' || h.rec.glyph"
              :glyph="h.kind === 'page' ? h.page.glyph : h.rec.glyph"
              :color="h.kind === 'page' ? h.page.color : h.rec.color"
            />
            <span
              v-else
              class="flex size-6 shrink-0 items-center justify-center text-dimmed"
              aria-hidden="true"
            >
              <span class="size-1.5 rounded-full bg-current" />
            </span>
            <span class="flex min-w-0 flex-1 flex-col py-1">
              <span class="truncate text-15 text-highlighted">{{ h.kind === 'page' ? h.page.title || 'Без названия' : h.rec.text }}</span>
              <span
                v-if="h.kind === 'record' || byText(h)"
                class="truncate text-caption text-toned"
              >{{ [h.kind === 'record' ? data.placeOf(h.rec).title : '', byText(h) ? 'упомянуто в тексте' : ''].filter(Boolean).join(' · ') }}</span>
            </span>
            <UIcon
              v-if="linked.has(idOf(h))"
              name="i-lucide-check"
              class="size-4.5 shrink-0 text-accent"
            />
          </button>
        </li>
      </template>
      <li
        v-if="!groups.length"
        class="px-3 py-5 text-meta text-toned"
      >
        {{ q.trim() ? 'Ничего не нашлось' : 'Найди страницу или запись по названию' }}
      </li>
    </ul>
  </AdaptiveOverlay>
</template>
