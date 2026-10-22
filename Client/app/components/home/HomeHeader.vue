<script setup lang="ts">
// Top of Главная. Phone: the title in the page-title role and two glyphs, Найти and «⋯» (main flow, items 1, 19, 20).
// Desktop: the 72px title header with «⋯» only (Найти is in the sidebar).
// «⋯» of Главная: the view first («Вид»: «Со сводкой», «Компактный», a tick on the chosen one), then Журнал, Настройки,
// «Новая секция» and Корзина. A new page is the «+» at «Мои страницы» (item 16). On the phone it is a popover under the
// header, as in Notes and Reminders, not a sheet.
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from '#imports'
import { useDataStore } from '~/stores/data'
import { useFind } from '~/composables/useFind'
import ActionMenu, { type MenuItem } from '../overlay/ActionMenu.vue'
import DotsButton from '../common/DotsButton.vue'
import TitleHeader from '../shell/TitleHeader.vue'

const emit = defineEmits<{ newSection: [], top: [] }>()
const data = useDataStore()
const router = useRouter()
const find = useFind()

const VIEWS = [
  { value: 'summary', label: 'Со сводкой' },
  { value: 'compact', label: 'Компактный' }
] as const
const view = computed(() => data.settings.homeRows === 'compact' ? 'compact' : 'summary')
const setView = (v: 'summary' | 'compact') => data.setSettings({ homeRows: v })

const go = [
  { label: 'Журнал', icon: 'cer:journal', run: () => void router.push('/journal') },
  { label: 'Настройки', icon: 'i-lucide-settings', run: () => void router.push('/settings') },
  { label: 'Новая секция', icon: 'i-lucide-list-plus', run: () => emit('newSection') },
  { label: 'Корзина', icon: 'i-lucide-trash-2', run: () => void router.push('/settings/trash') }
]

/** Desktop keeps its dropdown: the same rows, the view as two checked rows */
const items = computed<MenuItem[][]>(() => [
  VIEWS.map(v => ({ label: v.label, icon: v.value === 'compact' ? 'i-lucide-rows-3' : 'i-lucide-rows-2', checked: view.value === v.value, onSelect: () => setView(v.value) })),
  go.map(g => ({ label: g.label, icon: g.icon, onSelect: g.run }))
])

// ---------- the phone's popover ----------

const open = ref(false)
const button = useTemplateRef<HTMLButtonElement>('button')
const menu = useTemplateRef<HTMLElement>('menu')
function toggle() {
  open.value = !open.value
}
function close(focus = true) {
  open.value = false
  if (focus) button.value?.focus()
}
function pick(run: () => void) {
  close(false)
  run()
}
function key(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
  }
}
watch(open, async (v) => {
  if (v) {
    document.addEventListener('keydown', key, true)
    await nextTick()
    menu.value?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus()
  } else {
    document.removeEventListener('keydown', key, true)
  }
})
onBeforeUnmount(() => document.removeEventListener('keydown', key, true))
</script>

<template>
  <TitleHeader title="Главная">
    <ActionMenu
      :items="items"
      title="Главная"
      label="Меню Главной"
    >
      <DotsButton
        label="Меню Главной"
        tone="muted"
      />
    </ActionMenu>
  </TitleHeader>
  <header class="relative box-content flex h-13 shrink-0 items-center pt-[env(safe-area-inset-top)] pr-1 pl-4 lg:hidden">
    <h1 class="min-w-0 flex-1">
      <button
        type="button"
        class="max-w-full cursor-pointer truncate text-left text-title font-semibold text-highlighted"
        @click="emit('top')"
      >
        Главная
      </button>
    </h1>
    <button
      type="button"
      class="hit-44 relative flex size-11 cursor-pointer items-center justify-center rounded-item text-toned active:bg-pressed"
      aria-label="Найти"
      @click="find.open()"
    >
      <UIcon
        name="i-lucide-search"
        class="size-5"
      />
    </button>
    <button
      ref="button"
      type="button"
      class="flex size-11 cursor-pointer items-center justify-center rounded-item text-toned active:bg-pressed"
      aria-label="Меню Главной"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
    >
      <UIcon
        name="i-lucide-ellipsis"
        class="size-4.5"
      />
    </button>

    <template v-if="open">
      <button
        type="button"
        class="fixed inset-0 z-20 cursor-default"
        aria-label="Закрыть меню"
        tabindex="-1"
        @click="close()"
      />
      <div
        ref="menu"
        class="absolute top-[calc(env(safe-area-inset-top)+48px)] right-4 z-21 w-58 rounded-[14px] border border-line bg-elev p-1.5 shadow-float dark:border-line2"
        role="menu"
        aria-label="Меню Главной"
        data-home-menu
      >
        <div
          class="px-2.5 pt-1 pb-0.5 text-cap leading-5 text-toned"
          aria-hidden="true"
        >
          Вид
        </div>
        <button
          v-for="v in VIEWS"
          :key="v.value"
          type="button"
          class="flex h-11 w-full cursor-pointer items-center gap-3 rounded-[10px] px-2.5 text-left text-base text-highlighted outline-none focus-visible:bg-hover active:bg-pressed"
          role="menuitemradio"
          :aria-checked="view === v.value"
          @click="pick(() => setView(v.value))"
        >
          <span class="min-w-0 flex-1 truncate">{{ v.label }}</span>
          <UIcon
            v-if="view === v.value"
            name="i-lucide-check"
            class="size-4.5 shrink-0 text-accent-ink"
          />
        </button>
        <div
          class="mx-1 my-1.5 h-px bg-line"
          role="separator"
        />
        <button
          v-for="g in go"
          :key="g.label"
          type="button"
          class="flex h-11 w-full cursor-pointer items-center gap-3 rounded-[10px] px-2.5 text-left text-base text-highlighted outline-none focus-visible:bg-hover active:bg-pressed"
          role="menuitem"
          @click="pick(g.run)"
        >
          {{ g.label }}
        </button>
      </div>
    </template>
  </header>
</template>
