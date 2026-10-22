<script setup lang="ts">
// «⋯» menus: a bottom sheet on a phone, a dropdown on desktop. Same items, same order.
// Until the menu code is in (useLater) the button stands on its own; a tap opens the menu once it is.
import { ref, watch } from 'vue'
import type { PageColor } from '~/domain/types'
import { useScreen } from '~/composables/useScreen'
import { useLater } from '~/composables/useLater'
import DotsButton from '../common/DotsButton.vue'
import OptionPill from '../common/OptionPill.vue'

export interface MenuItem {
  label: string
  icon: string
  /** Right side of the row: the current value («Дом», «еда, напитки…») */
  value?: string
  danger?: boolean
  /** The way back, in accent ink («Вернуть» in Корзина's row menu) */
  accent?: boolean
  /** A switch row («Компактные строки»): the row toggles and shows its state */
  checked?: boolean
  /** A second line under the label («Записи останутся на странице») */
  hint?: string
  /** Shown but not offered; the hint says why («Это единственный вид страницы») */
  disabled?: boolean
  /** An option drawn as its pill («Переместить в колонку», v23); `label` stays what a screen reader says */
  pill?: { name: string, color: PageColor }
  onSelect: () => void
}

defineProps<{
  items: MenuItem[][]
  /** Sheet header: what the menu is about */
  title?: string
  caption?: string
  label: string
  /** Phone: no trigger of its own, opened through v-model:open from a line that already looks like a button */
  bare?: boolean
  /** Phone: a sheet without the title row (the menu of Главная) */
  headless?: boolean
  /** Desktop: the title (and caption) head the dropdown too, as on the phone's sheet */
  labelled?: boolean
  /** Desktop: which edge of the trigger the dropdown lines up with; «⋯» buttons sit at a row's end */
  align?: 'start' | 'end'
  /** Phone: hairlines between the groups (Входящие's other guesses, «Удалить вид», Главная's menu); other sheets run on */
  divided?: boolean
  /** Desktop: 260 wide, for rows that are page names (Входящие's other guesses) */
  wide?: boolean
}>()

const { isDesktop } = useScreen()
const later = useLater()
const open = defineModel<boolean>('open', { default: false })
// A phone sheet is mounted on first open and kept for its closing animation: a long page has a «⋯» on
// every row, and a sheet each would cost seconds to open the page
const used = ref(false)
watch(open, (v) => {
  if (v) used.value = true
}, { immediate: true })

function openNow() {
  open.value = true
  void later.load()
}

// The chosen action runs once the menu has closed and focus is back on its button, so an action
// that moves focus (rename puts it in a field, a dialog takes it) is not undone by the closing menu
let pending: MenuItem | null = null
let fallback: ReturnType<typeof setTimeout> | undefined

function select(item: MenuItem) {
  pending = item
  open.value = false
  clearTimeout(fallback)
  fallback = setTimeout(run, 800)
}

function run() {
  clearTimeout(fallback)
  const item = pending
  pending = null
  item?.onSelect()
}

// A row with a second line: the icon stays with the first line, not between the two
const twoLines = { item: 'items-start py-2', itemLeadingIcon: 'mt-px' }

// Reka puts focus back on the button in a timeout of its own; the action runs in the next one
const afterClose = () => setTimeout(() => setTimeout(run))
</script>

<template>
  <LazyUDropdownMenu
    v-if="isDesktop && later.ready.value"
    v-model:open="open"
    :items="items.map((g, gi) => [
      // The head belongs to the first group: no line between it and the first items (ListTabMenu)
      ...(labelled && !gi ? [{ type: 'label' as const, label: title ?? label, slot: 'head' as const }] : []),
      ...g.map(i => i.checked === undefined
        ? { label: i.label, icon: i.icon, color: i.danger ? 'error' as const : i.accent ? 'primary' as const : undefined, onSelect: () => select(i), value: i.value, description: i.hint, disabled: i.disabled, pill: i.pill, slot: i.pill ? 'pill' as const : undefined, ui: i.hint ? twoLines : undefined }
        : { label: i.label, icon: i.icon, type: 'checkbox' as const, checked: i.checked, onSelect: () => select(i) })
    ])"
    :content="{ align: align ?? 'end', onCloseAutoFocus: afterClose }"
    :ui="wide ? { content: 'w-65' } : undefined"
  >
    <slot :open="open">
      <DotsButton
        :label="label"
        tone="muted"
      />
    </slot>
    <template #head-label>
      <span class="font-medium text-highlighted">{{ title ?? label }}</span><span
        v-if="caption"
        class="text-toned"
      > · {{ caption }}</span>
    </template>
    <template #pill-label="{ item }">
      <span class="sr-only">{{ item.label }}</span>
      <OptionPill
        v-bind="(item as { pill: { name: string, color: PageColor } }).pill"
        aria-hidden="true"
      />
    </template>
    <template #item-trailing="{ item }">
      <span
        v-if="(item as { value?: string }).value"
        class="max-w-36 truncate text-meta text-toned"
      >{{ (item as { value?: string }).value }}</span>
    </template>
  </LazyUDropdownMenu>
  <template v-else>
    <span
      v-if="isDesktop || !bare"
      class="contents"
      @click="openNow"
    >
      <slot :open="open">
        <DotsButton
          :label="label"
          tone="muted"
          :aria-expanded="open"
        />
      </slot>
    </span>
    <LazyUDrawer
      v-if="!isDesktop && used"
      v-model:open="open"
      :title="title ?? label"
      :content="{ onCloseAutoFocus: afterClose }"
      :ui="{ content: 'pb-[max(env(safe-area-inset-bottom),0.75rem)]' }"
    >
      <template #content>
        <div class="flex flex-col">
          <h2
            v-if="headless"
            class="sr-only"
          >
            {{ title ?? label }}
          </h2>
          <div
            v-else
            class="mx-3 flex items-center gap-2.5 px-3 pt-1.5 pb-2.5"
          >
            <slot name="head">
              <span class="min-w-0 flex-1 truncate text-base font-medium text-highlighted">{{ title ?? label }}</span>
            </slot>
            <span
              v-if="caption"
              class="shrink-0 text-13 text-toned"
            >{{ caption }}</span>
          </div>
          <!-- The first row follows the head straight away (canvas 62, `.shh`) -->
          <div
            class="flex flex-col px-2 pb-2"
            :class="{ 'pt-2': headless }"
          >
            <template
              v-for="(group, gi) in items"
              :key="gi"
            >
              <div
                v-if="gi > 0 && divided"
                class="mx-3 my-1.5 border-t border-default"
              />
              <button
                v-for="item in group"
                :key="item.label"
                type="button"
                class="flex min-h-12.5 w-full items-center gap-3 rounded-chip px-3 text-left text-base"
                :class="[
                  item.disabled ? 'cursor-default' : 'cursor-pointer active:bg-pressed',
                  item.disabled ? 'text-dimmed' : item.danger ? 'text-warn-ink' : item.accent ? 'text-accent-ink' : 'text-default'
                ]"
                :role="item.checked === undefined ? undefined : 'switch'"
                :aria-checked="item.checked"
                :aria-label="item.pill ? item.label : undefined"
                :aria-disabled="item.disabled || undefined"
                @click="item.disabled ? undefined : item.checked === undefined ? select(item) : item.onSelect()"
              >
                <UIcon
                  :name="item.icon"
                  class="size-5 shrink-0"
                  :class="item.danger || item.accent || item.disabled ? '' : 'text-toned'"
                />
                <span
                  v-if="item.pill"
                  class="flex min-w-0 flex-1"
                >
                  <OptionPill v-bind="item.pill" />
                </span>
                <span
                  v-else-if="item.hint"
                  class="flex min-w-0 flex-1 flex-col py-1.5"
                >
                  <span class="truncate">{{ item.label }}</span>
                  <span class="text-13 text-toned">{{ item.hint }}</span>
                </span>
                <span
                  v-else
                  class="truncate"
                  :class="item.value ? 'shrink-0' : 'min-w-0 flex-1'"
                >{{ item.label }}</span>
                <span
                  v-if="item.value"
                  class="min-w-0 flex-1 truncate text-right text-meta text-toned"
                >{{ item.value }}</span>
                <span
                  v-if="item.checked !== undefined"
                  class="flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors"
                  :class="item.checked ? 'bg-accent' : 'bg-trk ring ring-line2 ring-inset'"
                  aria-hidden="true"
                >
                  <span
                    class="size-5 rounded-full bg-knob shadow-seg transition-transform"
                    :class="item.checked ? 'translate-x-4' : 'shadow-none ring-[1.5px] ring-ring ring-inset'"
                  />
                </span>
              </button>
            </template>
          </div>
        </div>
      </template>
    </LazyUDrawer>
  </template>
</template>
