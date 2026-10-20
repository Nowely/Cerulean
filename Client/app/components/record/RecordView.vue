<script setup lang="ts">
// Every record is a page: its properties, a note edited in place, Подпункты.
// Same component full (from navigation) and as a preview (from a link).
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { useRouter } from '#imports'
import type { PropDef, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { usePeek } from '~/composables/usePeek'
import { formatAdded } from '~/domain/dates'
import RecordMark from '../common/RecordMark.vue'
import PageTile from '../common/PageTile.vue'
import RecordRow from './RecordRow.vue'
import PropValue from './PropValue.vue'

const props = withDefaults(defineProps<{ rec: Rec, container?: 'full' | 'preview' }>(), { container: 'full' })
const emit = defineEmits<{ editing: [boolean] }>()
const data = useDataStore()
const now = useNow()
const router = useRouter()
const peek = usePeek()

const full = computed(() => props.container === 'full')
const page = computed(() => data.pages[props.rec.pageId])
const parent = computed(() => props.rec.parentId ? data.records[props.rec.parentId] : undefined)
const subs = computed(() => data.subitemsOf(props.rec.id))
const done = computed(() => subs.value.filter(s => s.done).length)

const title = computed({
  get: () => props.rec.text,
  set: v => data.updateRecord(props.rec.id, { text: v })
})
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
      class="px-5 pt-1 lg:px-0"
      :class="container === 'preview' ? 'lg:px-4' : 'lg:pt-8'"
    >
      <div class="flex items-center gap-2 lg:gap-3">
        <RecordMark
          :rec="rec"
          :page="page"
          size="lg"
          class="-ml-2.5"
          @toggle="data.toggleDone(rec.id)"
        />
        <input
          v-if="full"
          v-model="title"
          class="min-w-0 flex-1 bg-transparent text-title text-highlighted caret-accent outline-none"
          :class="{ 'text-dimmed line-through': rec.done }"
          aria-label="Текст записи"
          enterkeyhint="done"
          @keydown.enter="($event.target as HTMLInputElement).blur()"
          @focus="emit('editing', true)"
          @blur="emit('editing', false)"
        >
        <h1
          v-else
          class="min-w-0 flex-1 text-title text-highlighted"
          :class="[{ 'text-dimmed line-through': rec.done }, container === 'preview' ? 'lg:text-xl' : '']"
        >
          {{ rec.text }}
        </h1>
      </div>
      <button
        type="button"
        class="mt-1 flex cursor-pointer items-center gap-1.5 text-meta text-toned hover:text-highlighted"
        :class="full ? 'lg:flex max-lg:hidden' : ''"
        @click="openPlace"
      >
        в
        <PageTile
          v-if="!parent"
          :glyph="page?.glyph"
          :color="page?.color"
          :size="18"
        />
        <span class="text-default">{{ parent?.text ?? page?.title }}</span>
      </button>
    </div>

    <!-- Properties: empty ones are hidden -->
    <dl
      class="mt-3 px-5 text-15 lg:mt-5 lg:px-0"
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
            :readonly="!full"
          />
        </dd>
      </div>
      <div
        v-if="rec.due || showAll"
        class="flex min-h-10 items-center"
      >
        <dt class="w-28 shrink-0 text-toned">
          Срок
        </dt>
        <dd class="flex min-w-0 flex-1 items-center">
          <PropValue
            :rec="rec"
            due
            :readonly="!full"
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
      <button
        v-if="full && hasHidden && !showAll"
        type="button"
        class="-ml-1 flex h-10 cursor-pointer items-center gap-1.5 rounded-item pr-2 pl-1 text-toned hover:text-highlighted"
        @click="showAll = true"
      >
        <UIcon
          name="i-lucide-plus"
          class="size-4.5"
        />Свойство
      </button>
    </dl>

    <!-- Note: edited where it is -->
    <div
      class="mt-3 border-t border-default pt-3"
      :class="container === 'preview' ? 'px-5 lg:mx-4 lg:px-0' : 'mx-5 lg:mx-0'"
    >
      <UTextarea
        v-if="full && (noteEditing || rec.note)"
        ref="noteBox"
        v-model="note"
        autoresize
        :rows="1"
        variant="none"
        placeholder="Заметка"
        aria-label="Заметка"
        class="w-full"
        :ui="{ base: 'p-0 text-body leading-relaxed text-default' }"
        @focus="noteEditing = true; emit('editing', true)"
        @blur="noteDone"
      />
      <p
        v-else-if="rec.note"
        class="whitespace-pre-line text-body leading-relaxed text-default"
      >
        {{ rec.note }}
      </p>
      <button
        v-else-if="full"
        type="button"
        class="-ml-1 flex h-10 cursor-pointer items-center rounded-item px-1 text-15 text-toned hover:text-highlighted"
        @click="editNote"
      >
        Добавить заметку
      </button>
    </div>

    <!-- Подпункты always have «Готово» -->
    <section
      v-if="subs.length || full"
      class="mt-5"
      aria-labelledby="subs-title"
    >
      <h2
        id="subs-title"
        class="px-5 pb-1 text-caption text-toned lg:px-0 lg:text-17 lg:font-semibold lg:text-highlighted"
        :class="container === 'preview' ? 'lg:px-4' : ''"
      >
        Подпункты
      </h2>
      <ul v-if="subs.length && page">
        <li
          v-for="s in subs"
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
      <p
        v-else
        class="px-5 py-1 text-meta text-toned lg:px-0"
      >
        Пиши внизу, чтобы добавить шаги
      </p>
    </section>
  </div>
</template>
