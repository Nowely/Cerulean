<script setup lang="ts">
// Корзина: deleted pages and records, kept for 30 days. A row keeps «Вернуть»; its faint «⋯» has «Вернуть» above
// «Удалить навсегда», which asks first (v23, B7, M12)
import { computed } from 'vue'
import { useHead, useRouter } from '#imports'
import type { Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useNow } from '~/composables/useNow'
import { useNotify } from '~/composables/useNotify'
import { formatDayShort } from '~/domain/dates'
import { count, plural, RECORD_FORMS } from '~/domain/text'
import AppScreen from '~/components/shell/AppScreen.vue'
import DeskHeader from '~/components/shell/DeskHeader.vue'
import BackHeader from '~/components/shell/BackHeader.vue'
import PageTile from '~/components/common/PageTile.vue'
import DotsButton from '~/components/common/DotsButton.vue'
import ActionMenu, { type MenuItem } from '~/components/overlay/ActionMenu.vue'

useHead({ title: 'Корзина · Cerulean' })
const data = useDataStore()
const ui = useUiStore()
const now = useNow()
const notify = useNotify()
const router = useRouter()
/** Корзина goes back where it came from: «⋯» of Главная or Настройки (opened by its address: Настройки) */
const from = router.options.history.state.back as string | null
const back = from && !from.startsWith('/settings')
  ? { to: '/', label: 'Главная' }
  : { to: '/settings', label: 'Настройки' }

type Item = { kind: 'page', page: Page, at: number } | { kind: 'record', rec: Rec, at: number }
const items = computed<Item[]>(() => data.trash)
const keyOf = (i: Item) => i.kind === 'page' ? i.page.id : i.rec.id

/** Records that go with a deleted page */
function inside(page: Page): number {
  return Object.values(data.records).filter(r => r.pageId === page.id && !r.parentId && !r.deletedAt).length
}

/** «Задачи · удалено вчера», «4 записи · удалено 14 окт» (a page: its glyph says so): only the day, on one line; it wraps after a «·», never inside a date */
function detail(i: Item): string {
  const when = `удалено ${formatDayShort(i.at, now.value).replace(/ /g, '\u00a0')}`
  if (i.kind === 'page') return `${count(inside(i.page), RECORD_FORMS).replace(' ', '\u00a0')} · ${when}`
  const page = data.pages[i.rec.pageId]
  return `${!page || page.deletedAt ? 'страница удалена' : page.title || 'Без названия'} · ${when}`
}

function restore(i: Item) {
  if (i.kind === 'page') {
    data.restorePage(i.page.id)
    const id = i.page.id
    notify(`Страница ${i.page.title || 'Без названия'} вернулась`, { label: 'Открыть', run: () => router.push(`/p/${id}`) })
  } else {
    data.restoreRecords([i.rec.id])
    const pageId = i.rec.pageId
    notify(`Запись вернулась в ${data.pages[pageId]?.title || 'Без названия'}`, { label: 'Открыть', run: () => router.push(`/p/${pageId}`) })
  }
}

/** A page says what goes with it: «Страница и 4 записи в ней удалятся навсегда» */
function purgeText(i: Item): string {
  if (i.kind !== 'page') return 'Запись удалится навсегда. Вернуть будет нельзя.'
  const n = inside(i.page)
  return `${n ? `Страница и ${count(n, RECORD_FORMS)} в ней удалятся` : 'Страница удалится'} навсегда. Вернуть будет нельзя.`
}

const nameOf = (i: Item) => i.kind === 'page' ? i.page.title || 'Без названия' : i.rec.text

/** After the confirm the row goes and one plain line says so: nothing to take back, the confirm said it */
function purge(i: Item) {
  const name = nameOf(i)
  ui.confirm({
    title: `Удалить «${name}» навсегда?`,
    text: purgeText(i),
    action: 'Удалить навсегда',
    run: () => {
      if (i.kind === 'page') data.purgePages([i.page.id])
      else data.purgeRecords([i.rec.id])
      notify(`«${name}» удалено навсегда`, undefined, 4000)
    }
  })
}

/** The row's «⋯»: the way back first, in accent ink, then the heavy one in warn */
const menuOf = (i: Item): MenuItem[][] => [[
  { label: 'Вернуть', icon: 'i-lucide-undo-2', accent: true, onSelect: () => restore(i) },
  { label: 'Удалить навсегда', icon: 'i-lucide-trash-2', danger: true, onSelect: () => purge(i) }
]]

/** «1 страница (4 записи) и 2 записи»: the count says what goes with a page too */
const what = computed(() => {
  const pages = items.value.flatMap(i => i.kind === 'page' ? [i.page] : [])
  const recs = items.value.length - pages.length
  const within = pages.reduce((n, p) => n + inside(p), 0)
  const pageWord = pages.length ? `${count(pages.length, ['страница', 'страницы', 'страниц'])}${within ? ` (${count(within, RECORD_FORMS)})` : ''}` : ''
  return [pageWord, recs ? count(recs, RECORD_FORMS) : ''].filter(Boolean).join(' и ')
})

function empty() {
  const one = items.value.length === 1
  const n = items.value.filter(i => i.kind === items.value[0]?.kind).length === items.value.length ? items.value.length : 2
  ui.confirm({
    title: 'Очистить Корзину?',
    text: `${what.value} ${plural(n, ['удалится', 'удалятся', 'удалятся'])} навсегда. Вернуть ${one ? 'её' : 'их'} будет нельзя.`,
    action: 'Удалить навсегда',
    run: () => data.emptyTrash()
  })
}
</script>

<template>
  <AppScreen>
    <template #header>
      <BackHeader
        :to="back.to"
        :label="back.label"
      >
        <UButton
          v-if="items.length"
          color="error"
          variant="ghost"
          size="lg"
          class="px-3 font-normal"
          @click="empty"
        >
          Очистить
        </UButton>
      </BackHeader>
      <DeskHeader>
        <nav
          aria-label="Путь"
          class="flex min-w-0 items-center gap-1.5"
        >
          <NuxtLink
            to="/settings"
            class="hover:text-highlighted"
          >Настройки</NuxtLink>
          <span class="text-dimmed">/</span>
          <b class="truncate font-medium text-highlighted">Корзина</b>
        </nav>
        <template #actions>
          <UButton
            v-if="items.length"
            color="error"
            variant="ghost"
            size="sm"
            @click="empty"
          >
            Очистить корзину
          </UButton>
        </template>
      </DeskHeader>
    </template>

    <div class="mx-auto w-full pb-8 lg:max-w-180 lg:px-8 lg:pt-7">
      <h1 class="px-4 pt-1 text-title text-highlighted lg:px-0 lg:pt-0">
        Корзина
      </h1>
      <p
        v-if="items.length"
        class="px-4 pt-0.5 pb-2 text-sm text-toned lg:px-0 lg:pt-2 lg:pb-4"
      >
        Удалённое хранится 30 дней, потом исчезает само
      </p>

      <ul
        v-if="items.length"
        class="px-2 lg:px-0"
      >
        <li
          v-for="i in items"
          :key="keyOf(i)"
          class="group flex min-h-15 items-center gap-2 rounded-chip pr-1 pl-2 lg:min-h-12 lg:hover:bg-muted"
        >
          <span
            class="flex size-6 shrink-0 items-center justify-center"
            aria-hidden="true"
          >
            <PageTile
              v-if="i.kind === 'page'"
              :glyph="i.page.glyph"
              :color="i.page.color"
            />
            <span
              v-else
              class="size-1.5 rounded-full bg-ring"
            />
          </span>
          <span class="min-w-0 flex-1 py-2">
            <span class="block truncate text-record text-highlighted"><span
              v-if="i.kind === 'page'"
              class="sr-only"
            >Страница </span>{{ nameOf(i) }}</span>
            <span class="block text-meta text-toned">{{ detail(i) }}</span>
          </span>
          <span class="flex shrink-0 items-center gap-1">
            <UButton
              color="primary"
              variant="ghost"
              class="px-1.5 text-15 font-normal"
              @click="restore(i)"
            >
              Вернуть
            </UButton>
            <ActionMenu
              :items="menuOf(i)"
              :title="nameOf(i)"
              :caption="detail(i)"
              :label="`Ещё для «${nameOf(i)}»`"
            >
              <template #default="{ open }">
                <DotsButton
                  :label="`Ещё для «${nameOf(i)}»`"
                  :aria-expanded="open"
                />
              </template>
            </ActionMenu>
          </span>
        </li>
      </ul>
      <div
        v-else
        class="flex flex-col items-center px-8 pt-16 text-center"
      >
        <UIcon
          name="i-lucide-trash-2"
          class="size-8 text-dimmed"
        />
        <p class="mt-3 text-base text-highlighted">
          Корзина пуста
        </p>
        <p class="mt-1 text-meta text-toned">
          Удалённые страницы и записи будут здесь 30 дней
        </p>
      </div>
    </div>
  </AppScreen>
</template>
