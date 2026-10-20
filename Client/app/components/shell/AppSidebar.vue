<script setup lang="ts">
// Desktop navigation, no tabs (as in Codex): Главная, Найти, Чат; then Входящие and the sections as folding
// captions (Избранное, Недавнее, the user's sections); Настройки at the bottom. Folding is the same state as
// on Главная. Next to Главная the rows are bare (Главная carries the statuses); elsewhere overdue is said once,
// at its highest place.
import { computed, ref } from 'vue'
import { useRoute } from '#imports'
import type { Id, Page, Rec, Section } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { useFind } from '~/composables/useFind'
import { pageBadge, recordBadge, type Badge } from '~/domain/summary'
import { count } from '~/domain/text'
import PageTile from '../common/PageTile.vue'
import CountBadge from '../common/CountBadge.vue'
import SectionMenu from '../home/SectionMenu.vue'

const RECENT_SHOWN = 5

const data = useDataStore()
const route = useRoute()
const now = useNow()
const find = useFind()

const isCurrent = (path: string) => route.path === path
const onHome = computed(() => route.path === '/')
const folded = (key: string) => data.settings.folded.includes(key)
const pagesOf = (s: Section) => data.livePages.filter(p => p.sectionId === s.id)

const recentOpen = ref(false)
const recent = computed(() => data.recentlyMade)
const recentShown = computed(() => recentOpen.value ? recent.value : recent.value.slice(0, RECENT_SHOWN))

const waiting = computed(() => data.clarify.length)
const chatLabel = computed(() => waiting.value
  ? `Чат: ${count(waiting.value, ['запись ждёт', 'записи ждут', 'записей ждут'])} уточнения`
  : 'Чат')

// ---------- statuses ----------

const rawPage = (p: Page) => pageBadge(p, data.recordsOf(p.id), now.value, data.liveRecords)
const rawRec = (r: Rec) => recordBadge(data.subitemsOf(r.id), now.value)

/** The first visible row that says «просрочено» keeps warn */
const loudId = computed(() => {
  const rows: { id: Id, badge: Badge | null }[] = [{ id: data.inbox.id, badge: rawPage(data.inbox) }]
  if (!folded('favorites')) {
    for (const f of data.favorites) rows.push(f.kind === 'page' ? { id: f.page.id, badge: rawPage(f.page) } : { id: f.rec.id, badge: rawRec(f.rec) })
  }
  if (!folded('recent')) for (const p of recentShown.value) rows.push({ id: p.id, badge: rawPage(p) })
  for (const s of data.sectionList) if (!s.collapsed) for (const p of pagesOf(s)) rows.push({ id: p.id, badge: rawPage(p) })
  return rows.find(r => r.badge?.tone === 'warn')?.id ?? null
})
function shown(id: Id, b: Badge | null): Badge | null {
  if (!b || onHome.value) return null
  return b.tone === 'warn' && id !== loudId.value ? { ...b, tone: 'neutral' } : b
}
const badgeOf = (p: Page) => shown(p.id, rawPage(p))
const recBadge = (r: Rec) => shown(r.id, rawRec(r))

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
    <div class="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2.5 pt-2.5 pb-3.5">
      <NuxtLink
        to="/"
        class="side-row"
        :aria-current="onHome ? 'page' : undefined"
      >
        <UIcon
          name="cer:home"
          class="side-ico"
        />
        <span class="min-w-0 flex-1 truncate">Главная</span>
      </NuxtLink>
      <button
        type="button"
        class="side-row"
        :aria-current="find.isOpen.value ? 'page' : undefined"
        @click="find.open()"
      >
        <UIcon
          name="i-lucide-search"
          class="side-ico"
        />
        <span class="min-w-0 flex-1 truncate">Найти</span>
        <span class="text-13 text-dimmed">Ctrl K</span>
      </button>
      <NuxtLink
        to="/chat"
        class="side-row"
        :aria-current="isCurrent('/chat') ? 'page' : undefined"
        :aria-label="chatLabel"
      >
        <span class="relative flex">
          <UIcon
            name="i-lucide-message-square"
            class="side-ico"
          />
          <span
            v-if="waiting"
            class="absolute -top-0.5 -right-0.75 size-2 rounded-full bg-accent ring-2 ring-side"
            aria-hidden="true"
          />
        </span>
        <span class="min-w-0 flex-1 truncate">Чат</span>
      </NuxtLink>

      <NuxtLink
        :to="`/p/${data.inbox.id}`"
        class="side-row mt-3"
        :aria-current="isCurrent(`/p/${data.inbox.id}`) ? 'page' : undefined"
      >
        <PageTile
          :glyph="data.inbox.glyph"
          :size="16"
        />
        <span class="min-w-0 flex-1 truncate">Входящие</span>
        <CountBadge
          v-if="badgeOf(data.inbox)"
          :badge="badgeOf(data.inbox)!"
        />
      </NuxtLink>

      <section
        v-if="data.favorites.length"
        aria-label="Избранное"
      >
        <div class="side-head">
          <button
            type="button"
            class="side-head-btn"
            :aria-expanded="!folded('favorites')"
            @click="data.toggleFolded('favorites')"
          >
            Избранное <UIcon
              name="i-lucide-chevron-down"
              class="side-chev"
              :class="{ '-rotate-90': folded('favorites') }"
            />
          </button>
        </div>
        <template v-if="!folded('favorites')">
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
                :size="16"
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
                :size="16"
              />
              <span class="min-w-0 flex-1 truncate">{{ f.rec.text }}</span>
              <CountBadge
                v-if="recBadge(f.rec)"
                :badge="recBadge(f.rec)!"
              />
            </NuxtLink>
          </template>
        </template>
      </section>

      <section
        v-if="recent.length"
        aria-label="Недавнее"
      >
        <div class="side-head">
          <button
            type="button"
            class="side-head-btn"
            :aria-expanded="!folded('recent')"
            @click="data.toggleFolded('recent')"
          >
            Недавнее <UIcon
              name="i-lucide-chevron-down"
              class="side-chev"
              :class="{ '-rotate-90': folded('recent') }"
            />
          </button>
        </div>
        <template v-if="!folded('recent')">
          <NuxtLink
            v-for="p in recentShown"
            :key="p.id"
            :to="`/p/${p.id}`"
            class="side-row"
            :aria-current="isCurrent(`/p/${p.id}`) ? 'page' : undefined"
          >
            <PageTile
              :glyph="p.glyph"
              :size="16"
            />
            <span
              class="min-w-0 flex-1 truncate"
              :class="{ 'text-dimmed': !p.title }"
            >{{ p.title || 'Без названия' }}</span>
            <CountBadge
              v-if="badgeOf(p)"
              :badge="badgeOf(p)!"
            />
          </NuxtLink>
          <button
            v-if="recent.length > RECENT_SHOWN"
            type="button"
            class="side-row text-toned"
            :aria-expanded="recentOpen"
            @click="recentOpen = !recentOpen"
          >
            <span class="w-4" />{{ recentOpen ? 'Свернуть' : `Ещё ${recent.length - RECENT_SHOWN}` }}
          </button>
        </template>
      </section>

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
              class="side-chev"
              :class="{ '-rotate-90': s.collapsed }"
            />
          </button>
          <span class="flex opacity-0 group-hover/head:opacity-100 group-focus-within/head:opacity-100 has-aria-expanded:opacity-100">
            <SectionMenu
              :section="s"
              @rename="startRename(s)"
            />
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
              :size="16"
            />
            <span
              class="min-w-0 flex-1 truncate"
              :class="{ 'text-dimmed': !p.title }"
            >{{ p.title || 'Без названия' }}</span>
            <CountBadge
              v-if="badgeOf(p)"
              :badge="badgeOf(p)!"
            />
          </NuxtLink>
        </template>
      </section>
    </div>
    <div class="shrink-0 px-2.5 pb-2.5">
      <NuxtLink
        to="/settings"
        class="side-row"
        :aria-current="route.path.startsWith('/settings') ? 'page' : undefined"
      >
        <UIcon
          name="i-lucide-settings"
          class="side-ico"
        />
        <span class="min-w-0 flex-1 truncate">Настройки</span>
      </NuxtLink>
    </div>
  </aside>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.side-row {
  @apply relative flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-item py-1 pr-2 pl-2.5 text-left text-sm text-default hover:bg-side-hover hover:text-highlighted active:bg-pressed;
}

.side-row[aria-current="page"] {
  @apply bg-side-sel font-medium text-highlighted;
}

.side-row[aria-current="page"]::before {
  content: "";
  @apply absolute top-2 bottom-2 left-0 w-0.5 rounded-r-[2px] bg-accent;
}

.side-ico {
  @apply size-4 shrink-0 text-toned;
}

.side-head {
  @apply mt-3 flex items-center gap-0.5;
}

.side-head-btn {
  @apply flex h-7 min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-item px-2.5 text-left text-cap text-toned hover:text-highlighted;
}

.side-chev {
  @apply size-3.5 shrink-0 text-dimmed transition-transform;
}
</style>
