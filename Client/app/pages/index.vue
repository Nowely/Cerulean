<script setup lang="ts">
// Главная (main flow, items 1, 9, 16–20): Входящие and Сегодня at the top with no caption, then Избранное once a page
// of the person's own is starred, «Мои страницы» with its «+», and the person's sections, as quiet folding captions.
// Nothing describes anything: an empty page is its name. The field is docked at the bottom; after a send it stays open
// for the next record and a tap on Главная's free space puts it away.
import { computed, ref, useTemplateRef } from 'vue'
import { useHead } from '#imports'
import type { Id } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useFind } from '~/composables/useFind'
import { useCreatePage } from '~/composables/useCreatePage'
import AppScreen from '~/components/shell/AppScreen.vue'
import HomeHeader from '~/components/home/HomeHeader.vue'
import HomeRow from '~/components/home/HomeRow.vue'
import HomeCaption from '~/components/home/HomeCaption.vue'
import FlowField from '~/components/composer/FlowField.vue'
import StoreWarning from '~/components/home/StoreWarning.vue'
import CopyRow from '~/components/home/CopyRow.vue'

useHead({ title: 'Главная · Cerulean' })

const RECENT_SHOWN = 5

const data = useDataStore()
const ui = useUiStore()
const find = useFind()
const { create } = useCreatePage()
const screen = useTemplateRef<InstanceType<typeof AppScreen>>('screen')
const field = useTemplateRef<InstanceType<typeof FlowField>>('field')

const compact = computed(() => data.settings.homeRows === 'compact')
const folded = (key: string) => data.settings.folded.includes(key)
const pagesOf = (sectionId: Id) => data.livePages.filter(p => p.sectionId === sectionId)
const today = computed(() => data.livePages.find(p => p.kind === 'today'))

const recentOpen = ref(false)
const recent = computed(() => data.recentlyMade)
const recentShown = computed(() => recentOpen.value ? recent.value : recent.value.slice(0, RECENT_SHOWN))
const sections = computed(() => data.sectionList.map(s => ({ section: s, pages: pagesOf(s.id) })))

function addSection() {
  ui.renameSection = data.createSection('Новая секция').id
}

/** A tap on Главная's free space, not on a card, puts the open field away with the keyboard (item 9) */
function tapFree(e: MouseEvent) {
  const t = e.target as Element | null
  if (t?.closest('a, button, input, textarea, [role="listitem"], [contenteditable]')) return
  if (field.value?.isOpen) field.value.close()
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
      class="mx-auto min-h-full w-full px-2 pb-4 lg:max-w-196 lg:px-8"
      data-home
      @click="tapFree"
      @touchstart.passive="touchStart"
      @touchend.passive="touchEnd"
    >
      <StoreWarning
        v-if="data.storageError"
        class="mx-3 mt-1 mb-1 lg:mx-0 lg:mt-0 lg:mb-2"
      />
      <div role="list">
        <HomeRow
          :page="data.inbox"
          :compact="compact"
        />
        <HomeRow
          v-if="today"
          :page="today"
          :compact="compact"
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
            />
            <HomeRow
              v-else
              :rec="f.rec"
              :compact="compact"
            />
          </template>
        </div>
      </section>

      <!-- Мои страницы: pages without a section, newest first, five rows and «Ещё N»; «+» makes a page (item 16) -->
      <section aria-labelledby="cap-recent">
        <HomeCaption
          id="recent"
          name="Мои страницы"
          :folded="folded('recent')"
          :count="recent.length"
          :compact="compact"
          add
          @toggle="data.toggleFolded('recent')"
          @add="create()"
        />
        <template v-if="!folded('recent')">
          <div role="list">
            <HomeRow
              v-for="p in recentShown"
              :key="p.id"
              :page="p"
              :compact="compact"
            />
          </div>
          <button
            v-if="recent.length > RECENT_SHOWN"
            type="button"
            class="flex min-h-8 w-full cursor-pointer items-center gap-1 rounded-card pr-2 pl-15 text-left text-sm text-toned hover:bg-muted active:bg-pressed"
            :class="{ 'pl-9.5': compact }"
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
          />
          <div
            v-if="!pages.length"
            role="listitem"
          >
            <button
              type="button"
              class="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-card px-2 text-left text-base text-toned hover:bg-muted active:bg-pressed"
              @click="create({ sectionId: s.id })"
            >
              <UIcon
                name="i-lucide-plus"
                class="size-4.5 shrink-0 text-dimmed"
              />Новая страница
            </button>
          </div>
        </div>
      </section>

      <!-- A month after the last copy, while the browser may clear the data (v22 item 27); never on day one -->
      <CopyRow :compact="compact" />
    </div>

    <template #dock>
      <FlowField
        ref="field"
        mode="home"
      />
    </template>
  </AppScreen>
</template>
