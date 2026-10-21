<script setup lang="ts">
// Every record is a page: its properties, a note edited in place, Подпункты.
// Same component full (from navigation) and as a preview (from a link). A preview reads and ticks;
// the desktop panel (edit) also takes the note and the properties, the title stays for «Открыть».
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import { useRouter } from '#imports'
import type { PropDef, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useNow } from '~/composables/useNow'
import { usePeek } from '~/composables/usePeek'
import { useScreen } from '~/composables/useScreen'
import { formatAdded } from '~/domain/dates'
import RecordMark from '../common/RecordMark.vue'
import TitleField from '../common/TitleField.vue'
import PageTile from '../common/PageTile.vue'
import RecordRow from './RecordRow.vue'
import PropValue from './PropValue.vue'
import RecordLinks from './RecordLinks.vue'
import LinkPicker from './LinkPicker.vue'

const props = withDefaults(defineProps<{
  rec: Rec
  container?: 'full' | 'preview'
  /** The desktop panel: the note and the properties can be changed there too */
  edit?: boolean
  /** The screen shows «Связано» in a column of its own on wide screens */
  aside?: boolean
}>(), { container: 'full', edit: false, aside: false })
const emit = defineEmits<{ editing: [boolean] }>()
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
// Open subitems first; the done ones fold into «3 готово ›». One ticked while the record is open stays in its
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
const note = computed({
  get: () => props.rec.note,
  set: v => data.updateRecord(props.rec.id, { note: v })
})

// Empty properties are hidden; «+ Свойство» shows the empty ones to fill
const showAll = ref(false)
const shownProps = computed<PropDef[]>(() => (page.value?.props ?? []).filter((p) => {
  const v = props.rec.values[p.id]
  return showAll.value || (v !== null && v !== undefined && v !== '')
}))
const hasHidden = computed(() => (page.value?.props ?? []).length > shownProps.value.length || !props.rec.due)

const noteEditing = ref(false)
const noteBox = useTemplateRef<{ textareaRef?: HTMLTextAreaElement }>('noteBox')
async function editNote() {
  noteEditing.value = true
  emit('editing', true)
  await nextTick()
  noteBox.value?.textareaRef?.focus()
}
function noteDone() {
  noteEditing.value = false
  emit('editing', false)
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
    >
      <div class="flex items-center gap-2 lg:gap-3">
        <RecordMark
          :rec="rec"
          :page="page"
          size="lg"
          class="-ml-2.5"
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
          @focus="v => emit('editing', v)"
        />
        <h1
          v-else
          class="min-w-0 flex-1 text-title text-highlighted"
          :class="[{ 'text-dimmed line-through': rec.done }, container === 'preview' ? 'lg:text-xl' : '']"
        >
          {{ rec.text }}
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
    </div>

    <!-- Properties: empty ones are hidden -->
    <dl
      class="mt-2.5 px-4 text-15 lg:mt-5 lg:px-0"
      :class="container === 'preview' ? 'lg:px-4' : ''"
    >
      <div
        v-for="p in shownProps"
        :key="p.id"
        class="flex min-h-10 items-center"
      >
        <dt class="w-28 shrink-0 text-toned">
          {{ p.name }}
        </dt>
        <dd class="flex min-w-0 flex-1 items-center">
          <PropValue
            :rec="rec"
            :prop="p"
            :readonly="!editable"
          />
        </dd>
      </div>
      <!-- On desktop the empty Срок row offers «Добавить срок» -->
      <div
        v-if="rec.due || showAll || (isDesktop && editable)"
        class="flex min-h-10 items-center"
      >
        <dt class="w-28 shrink-0 text-toned">
          Срок
        </dt>
        <dd class="flex min-w-0 flex-1 items-center">
          <PropValue
            :rec="rec"
            due
            :readonly="!editable"
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
              class="block h-full rounded-full bg-accent"
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
      <div
        v-if="editable"
        class="-ml-1 flex gap-3"
      >
        <button
          v-if="hasHidden && !showAll"
          type="button"
          class="flex h-11 cursor-pointer items-center gap-1.5 rounded-item pr-2 pl-1 text-toned hover:text-highlighted lg:h-10"
          @click="showAll = true"
        >
          <UIcon
            name="i-lucide-plus"
            class="size-4.5"
          />Свойство
        </button>
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

    <!-- Note: edited where it is -->
    <div
      class="mt-3.5 mb-1 lg:mt-4"
      :class="container === 'preview' ? 'px-4 lg:mx-4 lg:px-0' : 'mx-4 lg:mx-0'"
    >
      <UTextarea
        v-if="editable && (noteEditing || rec.note)"
        ref="noteBox"
        v-model="note"
        autoresize
        :rows="1"
        variant="none"
        placeholder="Заметка"
        aria-label="Заметка"
        class="w-full"
        :ui="{ base: 'p-0 text-body leading-normal text-default lg:leading-relaxed' }"
        @focus="noteEditing = true; emit('editing', true)"
        @blur="noteDone"
      />
      <p
        v-else-if="rec.note"
        class="whitespace-pre-line text-body leading-normal text-default lg:leading-relaxed"
      >
        {{ rec.note }}
      </p>
      <button
        v-else-if="editable"
        type="button"
        class="-ml-1 flex h-10 cursor-pointer items-center rounded-item px-1 text-15 text-toned hover:text-highlighted"
        @click="editNote"
      >
        Добавить заметку
      </button>
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
        :class="container === 'preview' ? 'lg:px-2' : '-ml-2.5'"
      />
    </section>

    <!-- Подпункты always have «Готово» -->
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
        {{ doneSubs.length }} готово<UIcon
          name="i-lucide-chevron-right"
          class="size-3.5 text-dimmed transition-transform"
          :class="{ 'rotate-90': doneShown }"
        />
      </button>
      <p
        v-else-if="!subs.length"
        class="px-4 py-1 text-meta text-toned lg:px-0"
      >
        Подпунктов пока нет. Пиши внизу, и они появятся здесь.
      </p>
    </section>
  </div>
</template>
