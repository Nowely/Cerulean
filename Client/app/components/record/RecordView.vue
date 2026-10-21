<script setup lang="ts">
// Every record is a page: its properties, its body edited in place (v23), «Связано», Подпункты.
// Same component full (from navigation) and as a preview (from a link). A preview reads and ticks, and keeps
// the record's properties, «+ Свойство» and «Связать» (spec, Preview); the phone's sheet and the desktop panel (edit)
// also take the body. The title stays for «Открыть».
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import { useRouter } from '#imports'
import type { Id, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useNow } from '~/composables/useNow'
import { usePeek } from '~/composables/usePeek'
import { useScreen } from '~/composables/useScreen'
import { usePropSheets } from '~/composables/usePropSheets'
import { useFreshTail } from '~/composables/useTemplates'
import { formatAdded } from '~/domain/dates'
import { nb } from '~/domain/text'
import { hasValue, isNorm, propList, TYPE_ICONS, TYPE_NAMES } from '~/domain/props'
import RecordMark from '../common/RecordMark.vue'
import TitleField from '../common/TitleField.vue'
import PageTile from '../common/PageTile.vue'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'
import RecordRow from './RecordRow.vue'
import PropValue from './PropValue.vue'
import RecordLinks from './RecordLinks.vue'
import LinkPicker from './LinkPicker.vue'
import BodyField from '../body/BodyField.vue'
import { bodyOf } from '~/domain/body'

const props = withDefaults(defineProps<{
  rec: Rec
  container?: 'full' | 'preview'
  /** The phone's sheet and the desktop panel: the body can be changed there too */
  edit?: boolean
  /** The screen shows «Связано» in a column of its own on wide screens */
  aside?: boolean
}>(), { container: 'full', edit: false, aside: false })
const data = useDataStore()
const now = useNow()
const router = useRouter()
const peek = usePeek()
const { isDesktop } = useScreen()

const full = computed(() => props.container === 'full')
const editable = computed(() => full.value || props.edit)
const page = computed(() => data.pages[props.rec.pageId])
const parent = computed(() => props.rec.parentId ? data.records[props.rec.parentId] : undefined)
const subs = computed(() => data.subitemsOf(props.rec.id))
// Open subitems first; the done ones fold into «3 сделано ›». One ticked while the record is open stays in its
// place, struck through, until the record is opened again
const openedAt = ref(Date.now())
watch(() => props.rec.id, () => openedAt.value = Date.now())
const stays = (s: Rec) => !s.done || (s.tickedAt ?? 0) >= openedAt.value
const openSubs = computed(() => subs.value.filter(stays))
const doneSubs = computed(() => subs.value.filter(s => !stays(s)))
const doneShown = ref(false)
const done = computed(() => subs.value.filter(s => s.done).length)
const links = computed(() => data.linksOf(props.rec.id))
const linksTitle = useId()

const ui = useUiStore()
const titleField = useTemplateRef<InstanceType<typeof TitleField>>('titleField')
// «Переименовать» in «⋯»
watch([() => ui.focusTitle, titleField], async ([id, field]) => {
  if (!full.value || id !== props.rec.id || !field) return
  ui.focusTitle = null
  await nextTick()
  field.focus()
}, { immediate: true })
/** The body has the caret: an empty «Подпункты» stops pointing at the composer the bar replaced (M8) */
const bodyFocused = ref(false)
const bodyBox = useTemplateRef<HTMLElement>('bodyBox')
const tail = useFreshTail(() => full.value ? props.rec.id : undefined, bodyBox)

// Properties in the page's order. Empty ones are hidden, except one just picked in «+ Свойство»: it stays
// while the record is open, even empty (B12: never every empty property at once)
const added = ref<Id[]>([])
watch(() => props.rec.id, () => {
  added.value = []
})
const listed = computed(() => page.value ? propList(page.value, { norms: true }) : [])
const rows = computed(() => listed.value.filter((p) => {
  if (p.key === 'note') return false
  // On desktop the empty Срок row offers «Добавить срок»
  if (p.key === 'due') return !!props.rec.due || added.value.includes('due') || isDesktop.value
  return hasValue(props.rec.values[p.key]) || added.value.includes(p.key)
}))
/** «+ Свойство» lists what the record does not show yet; Заметка has its own row, «Норма» goes with its number */
const addable = computed(() => listed.value.filter(p => p.key !== 'note' && !rows.value.includes(p) && !(p.prop && isNorm(page.value!, p.prop))))

const values: Record<string, InstanceType<typeof PropValue> | null> = {}
const keepValue = (key: string, el: unknown) => {
  values[key] = el as InstanceType<typeof PropValue> | null
}
const picking = ref(false)
const propSheets = usePropSheets()
let afterPick: (() => void) | null = null

/** A pick adds just that row with its control open: a field, the options, the «Срок» sheet */
async function reveal(key: Id) {
  if (!added.value.includes(key)) added.value = [...added.value, key]
  await nextTick()
  values[key]?.open()
}
function pick(key: Id) {
  afterPick = () => void reveal(key)
  picking.value = false
}
/** «Новое свойство…»: the editor; what it makes is added to this record with its value open */
function newProp() {
  const pageId = props.rec.pageId
  afterPick = () => propSheets.create(pageId, { from: 'record', onBack: p => p && void reveal(p.id) })
  picking.value = false
}
function picked() {
  const run = afterPick
  afterPick = null
  run?.()
}

function openSub(r: Rec) {
  if (full.value) void router.push(`/r/${r.id}`)
  else peek.peek({ kind: 'record', id: r.id })
}
function openPlace() {
  if (parent.value) return full.value ? router.push(`/r/${parent.value.id}`) : peek.peek({ kind: 'record', id: parent.value.id })
  if (page.value) return full.value ? router.push(`/p/${page.value.id}`) : peek.peek({ kind: 'page', id: page.value.id })
}
</script>

<template>
  <div
    class="pb-4"
    :style="container === 'preview' ? '--row-bg: var(--ui-bg)' : undefined"
  >
    <div
      class="px-4 pt-1 lg:px-0"
      :class="container === 'preview' ? 'lg:px-4' : 'lg:pt-0.5'"
      data-title-block
    >
      <!-- «Запись изменили в другой вкладке»: above the title on a phone, under it on desktop (MobileTwoTabs, PageTwoTabs) -->
      <slot
        v-if="!isDesktop"
        name="status"
      />
      <div
        class="flex items-center lg:gap-3"
        :class="rec.glyph ? 'gap-2.5' : 'gap-2'"
      >
        <RecordMark
          :rec="rec"
          :page="page"
          size="lg"
          :class="rec.glyph ? '' : '-ml-2.5'"
          @toggle="data.toggleDone(rec.id)"
        />
        <TitleField
          v-if="full"
          ref="titleField"
          :value="rec.text"
          label="Текст записи"
          required
          :struck="rec.done"
          @save="t => data.updateRecord(rec.id, { text: t })"
        />
        <h1
          v-else
          class="min-w-0 flex-1 text-title text-highlighted"
          :class="[{ 'text-dimmed line-through': rec.done }, container === 'preview' ? 'lg:text-xl' : '']"
        >
          {{ nb(rec.text) }}
        </h1>
        <span
          v-if="full && $slots.menu"
          class="hidden shrink-0 lg:block"
        >
          <slot name="menu" />
        </span>
      </div>
      <button
        type="button"
        class="mt-1 flex cursor-pointer items-center gap-1.5 text-meta text-toned hover:text-highlighted"
        :class="full ? 'hidden' : ''"
        @click="openPlace"
      >
        <PageTile
          v-if="!parent"
          :glyph="page?.glyph"
          :color="page?.color"
          :size="16"
        />
        <span class="text-default">{{ parent?.text ?? page?.title }}</span>
      </button>
      <slot
        v-if="isDesktop"
        name="status"
      />
    </div>

    <!-- Properties in the page's order: empty ones are hidden -->
    <dl
      class="mt-2.5 px-4 text-15 lg:mt-5 lg:px-0"
      :class="container === 'preview' ? 'lg:px-4' : ''"
    >
      <div
        v-for="p in rows"
        :key="p.key"
        class="flex min-h-10 items-center"
      >
        <dt class="w-28 shrink-0 text-toned">
          {{ p.name }}
        </dt>
        <dd class="flex min-w-0 flex-1 items-center">
          <PropValue
            :ref="el => keepValue(p.key, el)"
            :rec="rec"
            :prop="p.prop"
            :due="p.key === 'due'"
          />
        </dd>
      </div>
      <!-- A single subitem shows its own state, a bar would only repeat it -->
      <div
        v-if="subs.length > 1"
        class="flex min-h-10 items-center"
      >
        <dt class="w-28 shrink-0 text-toned">
          Прогресс
        </dt>
        <dd class="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            class="h-1.5 w-40 overflow-hidden rounded-full bg-trk"
            role="img"
            :aria-label="`${done} из ${subs.length}`"
          >
            <span
              class="block h-full rounded-full bg-toned"
              :style="{ width: `${(done / subs.length) * 100}%` }"
            />
          </span>
          <span class="text-highlighted tabular-nums">{{ done }} из {{ subs.length }}</span>
        </dd>
      </div>
      <div
        v-if="rec.tags.includes('clarify')"
        class="flex min-h-10 items-center"
      >
        <dt class="w-28 shrink-0 text-toned">
          Метка
        </dt>
        <dd class="text-accent-ink">
          уточнить
        </dd>
      </div>
      <div class="flex min-h-10 items-center">
        <dt class="w-28 shrink-0 text-toned">
          Добавлено
        </dt>
        <dd class="text-highlighted">
          {{ formatAdded(rec.via, rec.addedAt, now) }}
        </dd>
      </div>
      <div class="-ml-1 flex gap-3">
        <!-- «+ Свойство»: only what the record does not show yet, and «Новое свойство…» (B12) -->
        <AdaptiveOverlay
          v-model:open="picking"
          title="Добавить свойство"
          :subtitle="rec.text"
          width="w-72"
          align="start"
          @closed="picked"
        >
          <template #trigger>
            <button
              type="button"
              class="flex h-11 cursor-pointer items-center gap-1.5 rounded-item pr-2 pl-1 text-toned hover:text-highlighted lg:h-10"
              :aria-expanded="picking"
            >
              <UIcon
                name="i-lucide-plus"
                class="size-4.5"
              />Свойство
            </button>
          </template>
          <div class="flex flex-col pb-1">
            <button
              v-for="p in addable"
              :key="p.key"
              type="button"
              class="flex min-h-12.5 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
              @click="pick(p.key)"
            >
              <UIcon
                :name="TYPE_ICONS[p.type]"
                class="size-5 shrink-0 text-toned"
              />
              <span class="min-w-0 flex-1 truncate text-highlighted">{{ p.name }}</span>
              <span class="shrink-0 text-sm text-toned">{{ TYPE_NAMES[p.type] }}</span>
            </button>
            <p
              v-if="!addable.length"
              class="px-3 pt-1 pb-2.5 text-sm text-toned"
            >
              Все свойства страницы уже есть у записи.
            </p>
            <template v-if="page?.kind === 'page'">
              <div class="mx-3 my-1.5 border-t border-default" />
              <button
                type="button"
                class="flex min-h-12.5 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base text-highlighted hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
                aria-haspopup="dialog"
                @click="newProp"
              >
                <UIcon
                  name="i-lucide-plus"
                  class="size-5 shrink-0 text-toned"
                />Новое свойство…
              </button>
            </template>
          </div>
        </AdaptiveOverlay>
        <LinkPicker :rec="rec">
          <button
            type="button"
            class="flex h-11 cursor-pointer items-center gap-1.5 rounded-item pr-2 pl-1 text-toned hover:text-highlighted lg:h-10"
          >
            <UIcon
              name="i-lucide-link"
              class="size-4.5"
            />Связать
          </button>
        </LinkPicker>
      </div>
    </dl>

    <!-- The body (v23): after «+ Свойство · Связать», never folded; empty, the faint «Заметка» -->
    <div
      ref="bodyBox"
      class="relative isolate mt-3 mb-1.5 lg:mt-3.5"
      :class="[container === 'preview' ? 'px-4 lg:mx-4 lg:px-0' : 'mx-4 lg:mx-0', { 'body-target': editable }]"
    >
      <!-- The paragraph just sent «В заметку» (v24, И3) -->
      <span
        v-if="tail"
        :key="tail.key"
        class="fresh-tint pointer-events-none absolute -inset-x-1.5 -z-1 rounded-item"
        :style="tail.style"
        aria-hidden="true"
      />
      <BodyField
        :key="rec.id"
        :owner="{ kind: 'record', id: rec.id }"
        :doc="bodyOf(rec)"
        placeholder="Заметка"
        label="Заметка"
        :context="rec.text"
        :editable="editable"
        @focus="v => bodyFocused = v"
      />
    </div>

    <!-- Связано: both ways; on a wide screen the record page shows it in a column instead -->
    <section
      v-if="links.length"
      class="lg:mt-2"
      :class="aside ? 'xl:hidden' : ''"
      :aria-labelledby="linksTitle"
    >
      <h2
        :id="linksTitle"
        class="px-4 pt-3 text-cap leading-6 text-toned lg:px-0 lg:pb-1 lg:leading-5"
        :class="container === 'preview' ? 'lg:px-4' : ''"
      >
        Связано
      </h2>
      <RecordLinks
        :rec="rec"
        class="px-2 lg:px-0"
        :class="container === 'preview' ? 'lg:px-2' : '-ml-1 lg:-ml-2.5'"
      />
    </section>

    <!-- Подпункты always have the checkbox -->
    <section
      v-if="subs.length || full"
      class="lg:mt-2"
      aria-labelledby="subs-title"
    >
      <h2
        id="subs-title"
        class="px-4 pt-3 text-cap leading-6 text-toned lg:px-0 lg:pb-1 lg:leading-5"
        :class="container === 'preview' ? 'lg:px-4' : ''"
      >
        Подпункты
      </h2>
      <ul v-if="subs.length && page">
        <li
          v-for="s in doneShown ? [...openSubs, ...doneSubs] : openSubs"
          :key="s.id"
        >
          <RecordRow
            :rec="s"
            :page="page"
            :view="undefined"
            :readonly="!full"
            wrap
            reveal
            @open="openSub(s)"
          />
        </li>
      </ul>
      <button
        v-if="doneSubs.length && page"
        type="button"
        class="mx-2 flex h-11 cursor-pointer items-center gap-1 rounded-item px-3 text-sm text-toned hover:bg-muted hover:text-highlighted active:bg-pressed lg:mx-0 lg:h-8 lg:px-1.5"
        :aria-expanded="doneShown"
        @click="doneShown = !doneShown"
      >
        {{ doneSubs.length }} сделано<UIcon
          name="i-lucide-chevron-right"
          class="size-3.5 text-dimmed transition-transform"
          :class="{ 'rotate-90': doneShown }"
        />
      </button>
      <p
        v-else-if="!subs.length"
        class="px-4 pt-1 text-15 leading-[1.5] text-toned lg:mt-0.5 lg:px-0 lg:pt-0 lg:leading-9 lg:text-dimmed"
      >
        {{ full && !bodyFocused ? 'Подпунктов пока нет. Пиши внизу, и они появятся здесь.' : 'Подпунктов пока нет.' }}
      </p>
    </section>
  </div>
</template>
