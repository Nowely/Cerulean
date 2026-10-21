<script setup lang="ts">
// Главная: Входящие, then sections as quiet folding captions: Избранное, Недавнее (pages without a section),
// the user's sections. Write at the bottom; what was written shows above the composer.
import { computed, ref, useTemplateRef } from 'vue'
import { useHead, useRouter } from '#imports'
import type { Id, Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useNow } from '~/composables/useNow'
import { useScreen } from '~/composables/useScreen'
import { useFind } from '~/composables/useFind'
import { useCreatePage } from '~/composables/useCreatePage'
import { pageBadge, recordBadge, type Badge } from '~/domain/summary'
import { TEMPLATES } from '~/domain/templates'
import AppScreen from '~/components/shell/AppScreen.vue'
import HomeHeader from '~/components/home/HomeHeader.vue'
import HomeRow from '~/components/home/HomeRow.vue'
import HomeCaption from '~/components/home/HomeCaption.vue'
import ComposerDock from '~/components/composer/ComposerDock.vue'

useHead({ title: 'Главная · Cerulean' })

const RECENT_SHOWN = 5

const data = useDataStore()
const now = useNow()
const router = useRouter()
const find = useFind()
const { isDesktop } = useScreen()
const { create } = useCreatePage()
const screen = useTemplateRef<InstanceType<typeof AppScreen>>('screen')

const compact = computed(() => data.settings.homeRows === 'compact')
const folded = (key: string) => data.settings.folded.includes(key)
const userPages = computed(() => data.livePages.filter(p => p.kind === 'page'))
const pagesOf = (sectionId: Id) => data.livePages.filter(p => p.sectionId === sectionId)
const showKey = computed(() => !data.settings.apiKey && !data.settings.dismissed.includes('key-card'))
const showStart = computed(() => !userPages.value.length && !data.settings.dismissed.includes('start-card'))
const dismiss = (id: string) => data.setSettings({ dismissed: [...data.settings.dismissed, id] })

/** The key row steps aside while a card is docked above the composer */
const docked = ref(false)
const recentOpen = ref(false)
const recent = computed(() => data.recentlyMade)
const recentShown = computed(() => recentOpen.value ? recent.value : recent.value.slice(0, RECENT_SHOWN))

const ui = useUiStore()
function addSection() {
  ui.renameSection = data.createSection('Новая секция').id
}

// ---------- statuses: overdue is flagged once per screen, at its highest place ----------

const badgeOf = (p: Page) => pageBadge(p, data.recordsOf(p.id), now.value, data.liveRecords)
const recBadgeOf = (r: Rec) => recordBadge(data.subitemsOf(r.id), now.value)
const RANK = { warn: 3, accent: 2, neutral: 1 } as const

/** The strongest status of a folded group: «1 просрочено», «2 уточнить» or «3 новых» */
function strongest(pages: Page[]): Badge | null {
  let best: Badge | null = null
  for (const p of pages) {
    const b = badgeOf(p)
    if (b && (!best || RANK[b.tone] > RANK[best.tone])) best = b
  }
  return best
}

const sections = computed(() => data.sectionList.map(s => ({ section: s, pages: pagesOf(s.id) })))

/** Every place on screen that can say «просрочено», top to bottom; the first keeps warn */
const loudKey = computed(() => {
  const places: { key: string, badge: Badge | null }[] = [{ key: data.inbox.id, badge: badgeOf(data.inbox) }]
  if (!folded('favorites')) {
    for (const f of data.favorites) places.push(f.kind === 'page' ? { key: f.page.id, badge: badgeOf(f.page) } : { key: f.rec.id, badge: recBadgeOf(f.rec) })
  }
  if (folded('recent')) places.push({ key: 'recent', badge: strongest(recent.value) })
  else for (const p of recentShown.value) places.push({ key: p.id, badge: badgeOf(p) })
  for (const { section, pages } of sections.value) {
    if (section.collapsed) places.push({ key: section.id, badge: strongest(pages) })
    else for (const p of pages) places.push({ key: p.id, badge: badgeOf(p) })
  }
  return places.find(p => p.badge?.tone === 'warn')?.key ?? null
})
const quiet = (key: string) => loudKey.value !== key
/** A folded caption's status, neutral when overdue was already said higher up */
function foldStatus(key: string, pages: Page[]): Badge | null {
  const b = strongest(pages)
  return b && b.tone === 'warn' && quiet(key) ? { ...b, tone: 'neutral' } : b
}

// ---------- pull down opens Поиск, the title scrolls to the top ----------

let y0: number | null = null
function touchStart(e: TouchEvent) {
  y0 = (screen.value?.scroller?.scrollTop ?? 0) <= 0 ? e.touches[0]!.clientY : null
}
function touchEnd(e: TouchEvent) {
  if (y0 !== null && e.changedTouches[0]!.clientY - y0 > 90) find.open()
  y0 = null
}
function toTop() {
  screen.value?.scroller?.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <AppScreen
    ref="screen"
    wide
  >
    <template #header>
      <HomeHeader
        @new-section="addSection"
        @top="toTop"
      />
    </template>

    <div
      class="mx-auto w-full pt-1 pr-1.5 pb-4 pl-2 lg:max-w-196 lg:px-8 lg:pt-0"
      @touchstart.passive="touchStart"
      @touchend.passive="touchEnd"
    >
      <div role="list">
        <HomeRow
          :page="data.inbox"
          :compact="compact"
          :quiet="quiet(data.inbox.id)"
        />
      </div>

      <section
        v-if="data.favorites.length"
        aria-labelledby="cap-favorites"
      >
        <HomeCaption
          id="favorites"
          name="Избранное"
          :folded="folded('favorites')"
          :count="data.favorites.length"
          :compact="compact"
          @toggle="data.toggleFolded('favorites')"
        />
        <div
          v-if="!folded('favorites')"
          role="list"
        >
          <template
            v-for="f in data.favorites"
            :key="f.kind + (f.kind === 'page' ? f.page.id : f.rec.id)"
          >
            <HomeRow
              v-if="f.kind === 'page'"
              :page="f.page"
              :compact="compact"
              :quiet="quiet(f.page.id)"
            />
            <HomeRow
              v-else
              :rec="f.rec"
              :compact="compact"
              :quiet="quiet(f.rec.id)"
            />
          </template>
        </div>
      </section>

      <!-- First run: templates as actions, then the key row -->
      <section
        v-if="showStart"
        aria-labelledby="cap-start"
      >
        <div class="mt-4 flex h-6 items-center">
          <h2
            id="cap-start"
            class="flex-1 px-2 text-cap text-toned"
          >
            Начать с шаблона
          </h2>
          <button
            type="button"
            class="hit-44 relative mr-0.5 flex size-9 cursor-pointer items-center justify-center rounded-item text-dimmed hover:text-highlighted"
            aria-label="Скрыть шаблоны"
            @click="dismiss('start-card')"
          >
            <UIcon
              name="i-lucide-x"
              class="size-4.5"
            />
          </button>
        </div>
        <div role="list">
          <div
            v-for="t in TEMPLATES"
            :key="t.key"
            role="listitem"
          >
            <button
              type="button"
              class="flex w-full cursor-pointer items-center gap-3 rounded-card px-2 text-left hover:bg-muted active:bg-pressed lg:rounded-chip"
              :class="compact ? 'min-h-8' : 'min-h-13 py-1.25 lg:min-h-12'"
              @click="create({ template: t.key, stay: true })"
            >
              <UIcon
                name="i-lucide-plus"
                class="size-4.5 shrink-0 text-toned"
              />
              <span class="flex min-w-0 flex-1 flex-col gap-px">
                <span
                  class="truncate"
                  :class="compact ? 'text-15 text-toned' : 'text-base text-default lg:text-sm'"
                >{{ t.name }}</span>
                <span
                  v-if="!compact"
                  class="truncate text-sm text-toned lg:text-13"
                >{{ t.description }}</span>
              </span>
            </button>
          </div>
        </div>
      </section>

      <div
        v-if="showKey && !docked"
        class="mt-3 flex items-center rounded-card hover:bg-muted lg:rounded-chip"
      >
        <button
          type="button"
          class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-card px-2 text-left active:bg-pressed lg:rounded-chip"
          :class="compact ? 'min-h-8' : 'min-h-13 py-1.25 lg:min-h-12'"
          @click="router.push('/settings?key')"
        >
          <UIcon
            name="i-lucide-key-round"
            class="size-4.5 shrink-0 text-toned"
          />
          <span class="flex min-w-0 flex-1 flex-col gap-px">
            <span
              class="truncate"
              :class="compact ? 'text-15 text-toned' : 'text-base text-default lg:text-sm'"
            >Добавить ключ</span>
            <span
              v-if="!compact"
              class="truncate text-sm text-toned lg:text-13"
            >Пока работают простые правила</span>
          </span>
        </button>
        <button
          type="button"
          class="hit-44 relative mr-1.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-item text-dimmed hover:text-highlighted"
          aria-label="Скрыть строку про ключ"
          @click="dismiss('key-card')"
        >
          <UIcon
            name="i-lucide-x"
            class="size-4.5"
          />
        </button>
      </div>

      <!-- Недавнее: pages without a section, newest first, five rows and «Ещё N» -->
      <section
        v-if="recent.length"
        aria-labelledby="cap-recent"
      >
        <HomeCaption
          id="recent"
          name="Недавнее"
          :folded="folded('recent')"
          :count="recent.length"
          :status="foldStatus('recent', recent)"
          :compact="compact"
          @toggle="data.toggleFolded('recent')"
        />
        <template v-if="!folded('recent')">
          <div role="list">
            <HomeRow
              v-for="p in recentShown"
              :key="p.id"
              :page="p"
              :compact="compact"
              :quiet="quiet(p.id)"
            />
          </div>
          <button
            v-if="recent.length > RECENT_SHOWN"
            type="button"
            class="flex min-h-8 w-full cursor-pointer items-center gap-1 rounded-card pr-2 pl-9.5 text-left text-sm text-toned hover:bg-muted active:bg-pressed lg:rounded-chip"
            :aria-expanded="recentOpen"
            @click="recentOpen = !recentOpen"
          >
            {{ recentOpen ? 'Свернуть' : `Ещё ${recent.length - RECENT_SHOWN}` }}
            <UIcon
              name="i-lucide-chevron-right"
              class="size-3.5 text-dimmed transition-transform"
              :class="recentOpen ? '-rotate-90' : ''"
            />
          </button>
          <div
            v-if="!isDesktop && userPages.length > 1 && !data.settings.dismissed.includes('hold-tip')"
            class="mt-1 flex items-center"
          >
            <p class="flex min-w-0 flex-1 items-center gap-3 px-2 py-1.5 text-sm text-toned">
              <UIcon
                name="i-lucide-pointer"
                class="size-4.5 shrink-0"
              />
              Удерживай строку, чтобы перенести страницу в секцию или в Избранное
            </p>
            <button
              type="button"
              class="hit-44 relative mr-0.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-item text-dimmed hover:text-highlighted"
              aria-label="Закрыть подсказку"
              @click="dismiss('hold-tip')"
            >
              <UIcon
                name="i-lucide-x"
                class="size-4.5"
              />
            </button>
          </div>
        </template>
      </section>

      <section
        v-for="{ section: s, pages } in sections"
        :key="s.id"
        :aria-labelledby="`cap-${s.id}`"
      >
        <HomeCaption
          :id="s.id"
          :name="s.name"
          :folded="s.collapsed"
          :count="pages.length"
          :status="foldStatus(s.id, pages)"
          :compact="compact"
          :section="s"
          :editing="ui.renameSection === s.id"
          @toggle="data.updateSection(s.id, { collapsed: !s.collapsed })"
          @done="ui.renameSection = null"
        />
        <div
          v-if="!s.collapsed"
          role="list"
        >
          <HomeRow
            v-for="p in pages"
            :key="p.id"
            :page="p"
            :compact="compact"
            :quiet="quiet(p.id)"
          />
          <div
            v-if="!pages.length"
            role="listitem"
          >
            <button
              type="button"
              class="flex w-full cursor-pointer items-center gap-3 rounded-card px-2 text-left hover:bg-muted active:bg-pressed lg:rounded-chip"
              :class="compact ? 'min-h-8 text-15 text-toned' : 'min-h-11 text-base text-default lg:text-sm'"
              @click="create({ sectionId: s.id })"
            >
              <UIcon
                name="i-lucide-square-pen"
                class="size-4.5 shrink-0 text-toned"
              />Новая страница
            </button>
          </div>
        </div>
      </section>
    </div>

    <template #dock>
      <ComposerDock
        :intro="!data.entries.length"
        @docked="v => docked = v"
      />
    </template>
  </AppScreen>
</template>
