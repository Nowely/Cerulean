<script setup lang="ts">
// «⋯» menus: a bottom sheet on a phone, a dropdown on desktop. Same items, same order.
// Until the menu code is in (useLater) the button stands on its own; a tap opens the menu once it is.
import { useScreen } from '~/composables/useScreen'
import { useLater } from '~/composables/useLater'

export interface MenuItem {
  label: string
  icon: string
  /** Right side of the row: the current value («Дом», «еда, напитки…») */
  value?: string
  danger?: boolean
  /** A switch row («Компактные строки»): the row toggles and shows its state */
  checked?: boolean
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
}>()

const { isDesktop } = useScreen()
const later = useLater()
const open = defineModel<boolean>('open', { default: false })

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

// Reka puts focus back on the button in a timeout of its own; the action runs in the next one
const afterClose = () => setTimeout(() => setTimeout(run))
</script>

<template>
  <LazyUDropdownMenu
    v-if="isDesktop && later.ready.value"
    v-model:open="open"
    :items="items.map(g => g.map(i => i.checked === undefined
      ? { label: i.label, icon: i.icon, color: i.danger ? 'error' as const : undefined, onSelect: () => select(i), value: i.value }
      : { label: i.label, icon: i.icon, type: 'checkbox' as const, checked: i.checked, onSelect: () => select(i) }))"
    :content="{ align: 'end', onCloseAutoFocus: afterClose }"
  >
    <slot :open="open">
      <UButton
        icon="i-lucide-ellipsis"
        variant="ghost"
        square
        :aria-label="label"
      />
    </slot>
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
        <UButton
          icon="i-lucide-ellipsis"
          variant="ghost"
          square
          :aria-label="label"
          :aria-expanded="open"
        />
      </slot>
    </span>
    <LazyUDrawer
      v-if="!isDesktop && (later.ready.value || open)"
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
            class="mx-3 flex items-center gap-2.5 border-b border-default px-3 pt-1.5 pb-2.5"
          >
            <slot name="head">
              <span class="min-w-0 flex-1 truncate text-base font-semibold text-highlighted">{{ title ?? label }}</span>
            </slot>
            <span
              v-if="caption"
              class="shrink-0 text-13 text-toned"
            >{{ caption }}</span>
          </div>
          <div class="flex flex-col p-2">
            <template
              v-for="(group, gi) in items"
              :key="gi"
            >
              <div
                v-if="gi > 0"
                class="mx-3 my-1 border-t border-default"
              />
              <button
                v-for="item in group"
                :key="item.label"
                type="button"
                class="flex min-h-12.5 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base active:bg-pressed"
                :class="item.danger ? 'text-warn-ink' : 'text-default'"
                :role="item.checked === undefined ? undefined : 'switch'"
                :aria-checked="item.checked"
                @click="item.checked === undefined ? select(item) : item.onSelect()"
              >
                <UIcon
                  :name="item.icon"
                  class="size-5 shrink-0"
                  :class="item.danger ? '' : 'text-toned'"
                />
                <span
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
                  :class="item.checked ? 'bg-accent' : 'bg-trk'"
                  aria-hidden="true"
                >
                  <span
                    class="size-5 rounded-full bg-knob shadow-seg transition-transform"
                    :class="item.checked ? 'translate-x-4' : 'ring-[1.5px] ring-ring ring-inset'"
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
