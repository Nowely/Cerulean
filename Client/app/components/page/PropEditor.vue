<script setup lang="ts">
// «Свойство»: the name, the type and for a «Выбор» its options (each the pill it is on a row with its name typed
// inside, v23; a tap opens its 8 colours; × to delete, a long press to reorder). A saved property changes at once, like «Настроить вид»: renaming, colours, order
// and adding are quiet; deleting an option and a type change that drops values toast with «Отменить», and
// deleting a property asks first, here in the sheet, only when records have values. A new property is a draft
// until «Создать», which waits for a name and, for a «Выбор», a named option (B12).
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import type { Id, Page, PageColor, PropDef, PropOption, PropType } from '~/domain/types'
import { COLOR_NAMES, PAGE_COLORS } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNotify } from '~/composables/useNotify'
import { LIFTED, useDragSort } from '~/composables/useDragSort'
import { canCreate, nextColor, optionColor } from '~/domain/props'
import { ofProp, plural, RECORD_FORMS } from '~/domain/text'
import { uid } from '~/domain/ids'
import SegmentedControl from '../common/SegmentedControl.vue'

/** `footer`: the dialog's footer has «Удалить свойство» (desktop) */
const props = defineProps<{ page: Page, propId: Id | null, type?: PropType, footer?: boolean }>()
const emit = defineEmits<{ back: [], created: [prop: PropDef] }>()
/** «Удалить «Отдел»?» takes the sheet's place; the header hides «Готово» meanwhile */
const confirming = defineModel<boolean>('confirming', { default: false })
const data = useDataStore()
const notify = useNotify()

const TYPES: { value: PropType, label: string }[] = [
  { value: 'text', label: 'Текст' },
  { value: 'number', label: 'Число' },
  { value: 'select', label: 'Выбор' },
  { value: 'date', label: 'Дата' }
]
const UNDO_MS = 8000

const isNew = computed(() => !props.propId)
const saved = computed(() => props.propId ? props.page.props.find(p => p.id === props.propId) : undefined)
const draft = reactive<{ name: string, type: PropType, options: PropOption[] }>({ name: '', type: props.type ?? 'text', options: [] })
const kind = computed({
  get: () => saved.value?.type ?? draft.type,
  set: retype
})
const options = computed(() => kind.value === 'select' ? (saved.value ? saved.value.options ?? [] : draft.options) : [])
const named = computed(() => options.value.filter(o => o.name.trim()))
/** Shown for a «Выбор» without a named option, and when the last one of a saved «Выбор» was tapped to delete */
const keepTried = ref(false)
const needOption = computed(() => kind.value === 'select' && (!named.value.length || (keepTried.value && named.value.length === 1)))
const ready = computed(() => canCreate(draft))

// Names are typed into drafts; a saved property takes a name at once unless it is empty, so an emptied name comes back
const name = ref(saved.value?.name ?? '')
const optionNames = reactive<Record<Id, string>>({})

function onName(v: string) {
  name.value = v
  if (isNew.value) draft.name = v
  else if (v.trim()) data.updateProp(props.page.id, props.propId!, { name: v.trim() })
}

function setOptions(next: PropOption[]) {
  if (isNew.value) draft.options = next
  else data.updateProp(props.page.id, props.propId!, { options: next })
}

function onOptionName(o: PropOption, v: string) {
  optionNames[o.id] = v
  if (isNew.value || v.trim()) setOptions(options.value.map(x => x.id === o.id ? { ...x, name: isNew.value ? v : v.trim() } : x))
}

/** «+ Вариант»: an empty option with the next free colour, the caret in it */
async function addOption() {
  const o: PropOption = { id: uid('o'), name: '', color: nextColor(options.value) }
  setOptions([...options.value, o])
  keepTried.value = false
  await nextTick()
  document.getElementById(`opt-${o.id}`)?.focus()
}

const colorFor = ref<Id | null>(null)
const dot = (o: PropOption) => optionColor(options.value, o)
/** A tap on the pill or the row around it: the caret goes in and the colours open under it */
function editOption(o: PropOption) {
  colorFor.value = o.id
  const field = document.getElementById(`opt-${o.id}`)
  if (field !== document.activeElement) field?.focus()
}
function setColor(o: PropOption, color: PageColor) {
  setOptions(options.value.map(x => x.id === o.id ? { ...x, color } : x))
  colorFor.value = null
}

/** The last named option of a saved «Выбор» stays: an empty one would offer an empty menu (B12) */
const keeps = (o: PropOption) => !isNew.value && named.value.length === 1 && !!o.name.trim()

function removeOption(o: PropOption) {
  colorFor.value = null
  if (keeps(o)) {
    keepTried.value = true
    return
  }
  if (isNew.value || !o.name.trim()) {
    setOptions(options.value.filter(x => x.id !== o.id))
    return
  }
  const prop = saved.value!
  const done = data.removeOption(props.page.id, prop.id, o.id)
  if (!done) return
  const what = done.count ? `, ${done.count} ${plural(done.count, RECORD_FORMS)} без ${ofProp(prop.name)}` : ''
  notify(`Вариант «${o.name.trim()}» удалён${what}`, { label: 'Отменить', run: done.undo }, UNDO_MS)
}

const drag = useDragSort({
  onDrop: (id, _group, index) => {
    const list = options.value.filter(o => o.id !== id)
    list.splice(index, 0, options.value.find(o => o.id === id)!)
    setOptions(list)
  }
})

function retype(t: PropType) {
  colorFor.value = null
  keepTried.value = false
  if (isNew.value) {
    draft.type = t
    return
  }
  const done = data.retypeProp(props.page.id, props.propId!, t)
  if (done?.dropped) {
    const n = done.dropped
    notify(`Тип изменён: ${n} ${plural(n, ['значение не подошло и удалено', 'значения не подошли и удалены', 'значений не подошли и удалены'])}`, { label: 'Отменить', run: done.undo }, UNDO_MS)
  }
}

// Deleting: at once without values, after the question with them; either way «Отменить» brings it all back
const usage = ref(0)
function removeProp() {
  const prop = saved.value
  if (!prop) return
  const n = data.propUsage(props.page.id, [prop.id, ...(prop.normProp ? [prop.normProp] : [])])
  if (n && !confirming.value) {
    usage.value = n
    confirming.value = true
    return
  }
  const done = data.removeProp(props.page.id, prop.id)
  confirming.value = false
  if (done) notify(`Свойство «${prop.name}» удалено`, { label: 'Отменить', run: done.undo }, UNDO_MS)
  emit('back')
}

function create() {
  if (!ready.value) return
  const prop = data.addProp(props.page.id, {
    name: draft.name.trim(),
    type: draft.type,
    ...(draft.type === 'select' ? { options: draft.options.filter(o => o.name.trim()).map(o => ({ ...o, name: o.name.trim() })) } : {})
  })
  if (prop) emit('created', prop)
}

/** On the way out an option that never got a name goes, and emptied names come back */
function tidy() {
  for (const k of Object.keys(optionNames)) delete optionNames[k]
  const prop = saved.value
  if (prop?.options?.some(o => !o.name.trim())) data.updateProp(props.page.id, prop.id, { options: prop.options.filter(o => o.name.trim()) })
  if (prop) name.value = prop.name
}
onBeforeUnmount(tidy)
defineExpose({ tidy, removeProp })
</script>

<template>
  <!-- The question before deleting a property with values -->
  <div
    v-if="confirming && saved"
    class="flex flex-col gap-2 px-3 pt-2 pb-1"
    role="alertdialog"
    :aria-label="`Удалить «${saved.name}»?`"
  >
    <h3 class="text-sheet text-highlighted">
      Удалить «{{ saved.name }}»?
    </h3>
    <p class="pb-3 text-15 text-toned">
      Значения пропадут у {{ usage }} {{ plural(usage, ['записи', 'записей', 'записей']) }}.
    </p>
    <UButton
      color="error"
      variant="solid"
      size="xl"
      class="w-full lg:h-9 lg:text-sm"
      @click="removeProp"
    >
      Удалить
    </UButton>
    <UButton
      size="xl"
      class="w-full lg:h-9 lg:text-sm"
      @click="confirming = false"
    >
      Отмена
    </UButton>
  </div>

  <div
    v-else
    class="flex flex-col px-3 pb-1"
  >
    <label
      for="prop-name"
      class="block px-1 pt-2 pb-2 text-cap text-toned"
    >Название</label>
    <UInput
      id="prop-name"
      :model-value="name"
      placeholder="Например, Магазин"
      autocomplete="off"
      class="w-full"
      :autofocus="isNew"
      @update:model-value="v => onName(String(v))"
    />

    <p class="px-1 pt-3.5 pb-2 text-cap text-toned">
      Тип
    </p>
    <SegmentedControl
      v-model="kind"
      :options="TYPES"
      label="Тип"
    />

    <template v-if="kind === 'select'">
      <p class="px-1 pt-4 pb-0.5 text-cap text-toned">
        Варианты
      </p>
      <p
        v-if="needOption"
        class="px-1 pb-1.5 text-13 text-toned"
      >
        Нужен хотя бы один вариант
      </p>
      <ul
        v-bind="drag.group('options')"
        aria-label="Варианты"
      >
        <li
          v-for="o in options"
          :key="o.id"
          v-bind="drag.item(o.id)"
          class="rounded-chip"
          :class="LIFTED"
        >
          <div class="flex min-h-12 items-center border-b border-default lg:min-h-10">
            <!-- The option reads as on a row: its pill, the name typed inside; like a title edited in place, the caret is
                 the only sign of editing. A hidden copy of the name sizes the pill -->
            <span
              class="flex min-w-0 flex-1 cursor-text items-center self-stretch pl-0.5"
              @click="editOption(o)"
            >
              <span
                class="inline-grid h-(--text-opt--line-height) max-w-full min-w-0 rounded-opt text-opt"
                :style="{ background: `var(--b-${dot(o)})`, color: `var(--c-${dot(o)}-ink)` }"
              >
                <span
                  class="invisible col-start-1 row-start-1 overflow-hidden px-2 whitespace-pre"
                  aria-hidden="true"
                >{{ `${(optionNames[o.id] ?? o.name) || 'Новый вариант'} ` }}</span>
                <input
                  :id="`opt-${o.id}`"
                  :value="optionNames[o.id] ?? o.name"
                  class="col-start-1 row-start-1 w-0 min-w-full rounded-opt bg-transparent px-2 caret-current outline-none placeholder:text-dimmed"
                  placeholder="Новый вариант"
                  autocomplete="off"
                  aria-label="Название варианта"
                  :aria-expanded="colorFor === o.id"
                  @input="e => onOptionName(o, (e.target as HTMLInputElement).value)"
                  @keydown.enter.prevent="(e) => (e.target as HTMLInputElement).blur()"
                >
              </span>
            </span>
            <button
              type="button"
              class="-mr-3 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-chip text-dimmed hover:bg-muted active:bg-pressed aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
              :aria-label="`Удалить вариант «${o.name || 'Новый вариант'}»`"
              :aria-disabled="keeps(o)"
              @click="removeOption(o)"
            >
              <UIcon
                name="i-lucide-x"
                class="size-4"
              />
            </button>
          </div>
          <div
            v-if="colorFor === o.id"
            class="-ml-1.5 flex border-b border-default pt-0.5 pb-2"
            role="group"
            :aria-label="`Цвет варианта «${o.name || 'Новый вариант'}»`"
          >
            <button
              v-for="c in PAGE_COLORS"
              :key="c"
              type="button"
              class="flex size-10 shrink-0 cursor-pointer items-center justify-center"
              :aria-label="COLOR_NAMES[c]"
              :aria-pressed="dot(o) === c"
              @click="setColor(o, c)"
            >
              <span
                class="size-5.5 rounded-full"
                :style="{ background: `var(--c-${c})`, boxShadow: dot(o) === c ? `0 0 0 2px var(--elev), 0 0 0 4px var(--c-${c})` : undefined }"
              />
            </button>
          </div>
          <button
            type="button"
            class="sr-only"
            tabindex="-1"
            @click="drag.move(o.id, -1)"
          >
            Выше: {{ o.name || 'Новый вариант' }}
          </button>
          <button
            type="button"
            class="sr-only"
            tabindex="-1"
            @click="drag.move(o.id, 1)"
          >
            Ниже: {{ o.name || 'Новый вариант' }}
          </button>
        </li>
      </ul>
      <button
        type="button"
        class="flex min-h-12.5 w-full cursor-pointer items-center gap-3 rounded-chip px-1 text-left text-base text-toned hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
        @click="addOption"
      >
        <UIcon
          name="i-lucide-plus"
          class="size-4.5 shrink-0"
        />Вариант
      </button>
    </template>

    <button
      v-if="!isNew && !footer"
      type="button"
      class="mt-2.5 flex min-h-12.5 w-full cursor-pointer items-center gap-3 rounded-chip px-1 text-left text-base text-warn-ink hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
      @click="removeProp"
    >
      <UIcon
        name="i-lucide-trash-2"
        class="size-4.5 shrink-0"
      />Удалить свойство
    </button>

    <div
      v-else-if="isNew"
      class="mt-4.5 flex justify-end gap-2"
    >
      <UButton
        size="lg"
        class="lg:h-9 lg:text-sm"
        @click="emit('back')"
      >
        Отмена
      </UButton>
      <UButton
        color="primary"
        variant="solid"
        size="lg"
        class="disabled:bg-btn disabled:text-toned disabled:opacity-100 lg:h-9 lg:text-sm"
        :disabled="!ready"
        @click="create"
      >
        Создать
      </UButton>
    </div>
  </div>
</template>
