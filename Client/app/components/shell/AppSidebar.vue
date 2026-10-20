<script setup lang="ts">
// Desktop navigation: the same tabs, «Найти ⌘K», Избранное, Входящие and the sections with their pages
import { computed, ref } from 'vue'
import { useRoute } from '#imports'
import type { Id, Page, Rec, Section } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { useFind } from '~/composables/useFind'
import { useCreatePage } from '~/composables/useCreatePage'
import { pageBadge, recordBadge } from '~/domain/summary'
import AppTabs from './AppTabs.vue'
import PageTile from '../common/PageTile.vue'
import CountBadge from '../common/CountBadge.vue'
import SectionMenu from '../home/SectionMenu.vue'

const data = useDataStore()
const route = useRoute()
const now = useNow()
const find = useFind()
const { create } = useCreatePage()
const favOpen = ref(true)

const current = computed(() => route.path)
const loose = computed(() => data.livePages.filter(p => p.kind === 'page' && !p.sectionId && p.favorite === null))
const pagesOf = (s: Section) => data.livePages.filter(p => p.sectionId === s.id)

function badgeOf(p: Page) {
  return pageBadge(p, data.recordsOf(p.id), now.value, data.liveRecords)
}
function recBadge(r: Rec) {
  return recordBadge(data.subitemsOf(r.id), now.value)
}
const isCurrent = (path: string) => current.value === path

// «Переименовать» from a section's «⋯»: the name becomes a field in place
const renaming = ref<Id | null>(null)
const draftName = ref('')
function startRename(s: Section) {
  draftName.value = s.name
  renaming.value = s.id
}
function finishRename(s: Section, save: boolean) {
  if (renaming.value !== s.id) return
  const name = draftName.value.trim()
  if (save && name) data.updateSection(s.id, { name })
  renaming.value = null
}
const vFocusOnMount = { mounted: (el: HTMLInputElement) => el.select() }
</script>

<template>
  <aside
    class="flex w-65 shrink-0 flex-col bg-side text-default"
    aria-label="Навигация"
  >
    <div class="shrink-0 px-2.5 pt-2.5 pb-1.5">
      <AppTabs variant="stack" />
    </div>
    <div class="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2.5 pb-3.5">
      <button
        type="button"
        class="side-row text-toned"
        @click="find.open()"
      >
        <span class="flex size-6 items-center justify-center"><UIcon
          name="i-lucide-search"
          class="size-4.5"
        /></span>
        <span class="min-w-0 flex-1 truncate">Найти</span>
        <UKbd value="meta" /><UKbd
          value="K"
          class="-ml-1"
        />
      </button>

      <template v-if="data.favorites.length">
        <div class="side-head">
          <button
            type="button"
            class="side-head-btn"
            :aria-expanded="favOpen"
            @click="favOpen = !favOpen"
          >
            Избранное <UIcon
              name="i-lucide-chevron-down"
              class="size-3.5 transition-transform"
              :class="favOpen ? '' : '-rotate-90'"
            />
          </button>
        </div>
        <template v-if="favOpen">
          <template
            v-for="f in data.favorites"
            :key="f.kind + (f.kind === 'page' ? f.page.id : f.rec.id)"
          >
            <NuxtLink
              v-if="f.kind === 'page'"
              :to="`/p/${f.page.id}`"
              class="side-row"
              :aria-current="isCurrent(`/p/${f.page.id}`) ? 'page' : undefined"
            >
              <PageTile
                :glyph="f.page.glyph"
                :color="f.page.color"
              />
              <span class="min-w-0 flex-1 truncate">{{ f.page.title || 'Без названия' }}</span>
              <CountBadge
                v-if="badgeOf(f.page)"
                :badge="badgeOf(f.page)!"
              />
            </NuxtLink>
            <NuxtLink
              v-else
              :to="`/r/${f.rec.id}`"
              class="side-row"
              :aria-current="isCurrent(`/r/${f.rec.id}`) ? 'page' : undefined"
            >
              <PageTile
                :glyph="f.rec.glyph ?? 'doc'"
                :color="f.rec.color ?? data.pages[f.rec.pageId]?.color"
              />
              <span class="min-w-0 flex-1 truncate">{{ f.rec.text }}</span>
              <CountBadge
                v-if="recBadge(f.rec)"
                :badge="recBadge(f.rec)!"
              />
            </NuxtLink>
          </template>
        </template>
      </template>

      <NuxtLink
        :to="`/p/${data.inbox.id}`"
        class="side-row mt-3.5"
        :aria-current="isCurrent(`/p/${data.inbox.id}`) ? 'page' : undefined"
      >
        <PageTile
          :glyph="data.inbox.glyph"
          :color="data.inbox.color"
        />
        <span class="min-w-0 flex-1 truncate">Входящие</span>
        <CountBadge
          v-if="badgeOf(data.inbox)"
          :badge="badgeOf(data.inbox)!"
        />
      </NuxtLink>

      <NuxtLink
        v-for="p in loose"
        :key="p.id"
        :to="`/p/${p.id}`"
        class="side-row"
        :aria-current="isCurrent(`/p/${p.id}`) ? 'page' : undefined"
      >
        <PageTile
          :glyph="p.glyph"
          :color="p.color"
        />
        <span
          class="min-w-0 flex-1 truncate"
          :class="p.title ? '' : 'text-dimmed'"
        >{{ p.title || 'Без названия' }}</span>
        <CountBadge
          v-if="badgeOf(p)"
          :badge="badgeOf(p)!"
        />
      </NuxtLink>

      <section
        v-for="s in data.sectionList"
        :key="s.id"
        :aria-label="s.name"
      >
        <div class="side-head group/head">
          <input
            v-if="renaming === s.id"
            v-model="draftName"
            v-focus-on-mount
            class="side-head-btn cursor-text bg-default text-highlighted ring ring-accent outline-none"
            aria-label="Название секции"
            enterkeyhint="done"
            @keydown.enter.prevent="finishRename(s, true)"
            @keydown.esc.prevent="finishRename(s, false)"
            @blur="finishRename(s, true)"
          >
          <button
            v-else
            type="button"
            class="side-head-btn"
            :aria-expanded="!s.collapsed"
            @click="data.updateSection(s.id, { collapsed: !s.collapsed })"
          >
            <span class="truncate">{{ s.name }}</span>
            <UIcon
              name="i-lucide-chevron-down"
              class="size-3.5 shrink-0 transition-transform"
              :class="s.collapsed ? '-rotate-90' : ''"
            />
          </button>
          <span class="flex opacity-0 group-hover/head:opacity-100 group-focus-within/head:opacity-100 has-aria-expanded:opacity-100">
            <SectionMenu
              :section="s"
              @rename="startRename(s)"
            />
            <UTooltip text="Новая страница">
              <UButton
                icon="i-lucide-plus"
                variant="ghost"
                square
                size="xs"
                :aria-label="`Новая страница в секции «${s.name}»`"
                @click="create({ sectionId: s.id })"
              />
            </UTooltip>
          </span>
        </div>
        <template v-if="!s.collapsed">
          <NuxtLink
            v-for="p in pagesOf(s)"
            :key="p.id"
            :to="`/p/${p.id}`"
            class="side-row"
            :aria-current="isCurrent(`/p/${p.id}`) ? 'page' : undefined"
          >
            <PageTile
              :glyph="p.glyph"
              :color="p.color"
            />
            <span
              class="min-w-0 flex-1 truncate"
              :class="p.title ? '' : 'text-dimmed'"
            >{{ p.title || 'Без названия' }}</span>
            <CountBadge
              v-if="badgeOf(p)"
              :badge="badgeOf(p)!"
            />
          </NuxtLink>
          <button
            v-if="!pagesOf(s).length"
            type="button"
            class="side-row text-toned"
            @click="create({ sectionId: s.id })"
          >
            <span class="flex size-6 items-center justify-center"><UIcon
              name="i-lucide-plus"
              class="size-4"
            /></span>Новая страница
          </button>
        </template>
      </section>

      <button
        type="button"
        class="side-row mt-3.5 text-toned"
        @click="create()"
      >
        <span class="flex size-6 items-center justify-center"><UIcon
          name="i-lucide-plus"
          class="size-4"
        /></span>Новая страница
      </button>
      <button
        type="button"
        class="side-row text-toned"
        @click="data.createSection('Новая секция')"
      >
        <span class="flex size-6 items-center justify-center"><UIcon
          name="i-lucide-folder-plus"
          class="size-4"
        /></span>Новая секция
      </button>
    </div>
  </aside>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.side-row {
  @apply relative flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-item py-1 pr-2 pl-1.5 text-left text-sm text-default hover:bg-side-hover hover:text-highlighted active:bg-pressed;
}

.side-row[aria-current="page"] {
  @apply bg-side-sel font-medium text-highlighted;
}

.side-row[aria-current="page"]::before {
  content: "";
  @apply absolute top-2 bottom-2 left-0 w-0.5 rounded-r-[2px] bg-accent;
}

.side-head {
  @apply mt-3.5 flex items-center gap-0.5;
}

.side-head-btn {
  @apply flex h-7 min-w-0 flex-1 cursor-pointer items-center gap-1.25 rounded-item px-2 text-left text-13 font-medium text-dimmed hover:text-highlighted;
}
</style>
