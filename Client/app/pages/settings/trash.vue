<script setup lang="ts">
// Корзина: deleted pages and records, kept for 30 days
import { computed } from 'vue'
import { useHead, useRouter } from '#imports'
import type { Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useNow } from '~/composables/useNow'
import { useNotify } from '~/composables/useNotify'
import { formatMoment } from '~/domain/dates'
import { count, RECORD_FORMS } from '~/domain/text'
import AppScreen from '~/components/shell/AppScreen.vue'
import DeskHeader from '~/components/shell/DeskHeader.vue'
import PageTile from '~/components/common/PageTile.vue'

useHead({ title: 'Корзина · Cerulean' })
const data = useDataStore()
const ui = useUiStore()
const now = useNow()
const notify = useNotify()
const router = useRouter()

type Item = { kind: 'page', page: Page, at: number } | { kind: 'record', rec: Rec, at: number }
const items = computed<Item[]>(() => data.trash)
const keyOf = (i: Item) => i.kind === 'page' ? i.page.id : i.rec.id

function detail(i: Item): string {
  const when = `удалено ${formatMoment(i.at, now.value)}`
  if (i.kind === 'page') {
    const n = Object.values(data.records).filter(r => r.pageId === i.page.id && !r.parentId && !r.deletedAt).length
    return `страница · ${count(n, RECORD_FORMS)} · ${when}`
  }
  return `из ${data.pages[i.rec.pageId]?.title || 'Без названия'} · ${when}`
}

function restore(i: Item) {
  if (i.kind === 'page') {
    data.restorePage(i.page.id)
    const id = i.page.id
    notify(`Страница «${i.page.title || 'Без названия'}» вернулась`, { label: 'Открыть', run: () => router.push(`/p/${id}`) })
  } else {
    data.restoreRecords([i.rec.id])
    const pageId = i.rec.pageId
    notify(`Вернул в «${data.pages[pageId]?.title || 'Без названия'}»`, { label: 'Открыть', run: () => router.push(`/p/${pageId}`) })
  }
}

function purge(i: Item) {
  ui.confirm({
    title: 'Удалить навсегда?',
    text: i.kind === 'page' ? `Страница «${i.page.title || 'Без названия'}» и её записи исчезнут без возможности вернуть.` : `«${i.rec.text}» исчезнет без возможности вернуть.`,
    action: 'Удалить',
    run: () => i.kind === 'page' ? data.purgePages([i.page.id]) : data.purgeRecords([i.rec.id])
  })
}

function empty() {
  ui.confirm({
    title: 'Очистить корзину?',
    text: `${count(items.value.length, ['объект', 'объекта', 'объектов'])} исчезнут без возможности вернуть.`,
    action: 'Очистить',
    run: () => data.emptyTrash()
  })
}
</script>

<template>
  <AppScreen>
    <template #header>
      <header class="flex h-13 shrink-0 items-center pt-[env(safe-area-inset-top)] pr-1.5 pl-1 lg:hidden">
        <NuxtLink
          to="/settings"
          class="flex h-11 items-center gap-0.5 rounded-card pr-2.5 pl-1 text-base text-accent-ink active:bg-pressed"
        >
          <UIcon
            name="i-lucide-chevron-left"
            class="size-6"
          />Настройки
        </NuxtLink>
        <span class="flex-1" />
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
      </header>
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
      <h1 class="px-5 pt-1 text-title text-highlighted lg:px-0 lg:pt-0">
        Корзина
      </h1>
      <p class="px-5 pt-1.5 pb-3 text-15 text-toned lg:px-0 lg:pt-2 lg:pb-4 lg:text-sm">
        Удалённое хранится 30 дней, потом исчезает само
      </p>

      <ul
        v-if="items.length"
        class="px-2 lg:px-0"
      >
        <li
          v-for="i in items"
          :key="keyOf(i)"
          class="group flex min-h-15 items-center gap-3 rounded-chip pr-1 pl-3 lg:min-h-12 lg:hover:bg-muted"
        >
          <PageTile
            v-if="i.kind === 'page'"
            :glyph="i.page.glyph"
            :color="i.page.color"
          />
          <span
            v-else
            class="flex size-6 shrink-0 items-center justify-center"
            aria-hidden="true"
          ><span
            class="size-1.5 rounded-full"
            :style="{ background: `var(--c-${data.pages[i.rec.pageId]?.color ?? 'gray'})` }"
          /></span>
          <span class="min-w-0 flex-1 py-2">
            <span class="block truncate text-record text-highlighted">{{ i.kind === 'page' ? (i.page.title || 'Без названия') : i.rec.text }}</span>
            <span class="block truncate text-meta text-toned">{{ detail(i) }}</span>
          </span>
          <UButton
            color="primary"
            variant="ghost"
            class="shrink-0"
            @click="restore(i)"
          >
            Вернуть
          </UButton>
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            square
            aria-label="Удалить навсегда"
            class="shrink-0 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
            @click="purge(i)"
          />
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
