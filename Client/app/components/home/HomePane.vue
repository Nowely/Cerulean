<script setup lang="ts">
// Главная (main flow, items 1, 9, 16–20): Входящие and Сегодня at the top with no caption, then Избранное once a page
// of the person's own is starred, «Мои страницы» with its «+», and the person's sections, as quiet folding captions.
// Nothing describes anything: an empty page is its name. The field is docked at the bottom; after a send it stays open
// for the next record and a tap on Главная's free space puts it away.
// The phone shows it as its first screen (pages/index.vue); a computer keeps it as the left column beside the open page,
// on the column's own surface (computer delta, items 1, 3), the same pane with the same field.
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import type { Id } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useCreatePage } from '~/composables/useCreatePage'
import { useHomeField, useSide } from '~/composables/useSide'
import AppScreen from '~/components/shell/AppScreen.vue'
import HomeHeader from '~/components/home/HomeHeader.vue'
import HomeRow from '~/components/home/HomeRow.vue'
import HomeCaption from '~/components/home/HomeCaption.vue'
import FlowField from '~/components/composer/FlowField.vue'
import StoreWarning from '~/components/home/StoreWarning.vue'
import CopyRow from '~/components/home/CopyRow.vue'

const RECENT_SHOWN = 5

const data = useDataStore()
const ui = useUiStore()
const { create } = useCreatePage()
const screen = useTemplateRef<InstanceType<typeof AppScreen>>('screen')
const field = useTemplateRef<InstanceType<typeof FlowField>>('field')
const side = useSide()
// On a computer this field is the only one: a key or a click anywhere can put it away (items 9, 20)
const homeField = useHomeField()
watch(field, (f) => {
  if (side) homeField.value = f ? { close: () => f.close(), isOpen: () => !!f.isOpen } : null
}, { immediate: true })
onBeforeUnmount(() => {
  if (side) homeField.value = null
})

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

// A pull down at the top is the browser's own: it reloads the page (Josh 28 Oct, 1). The title scrolls to the top
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
      class="mx-auto min-h-full w-full px-2 pb-4"
      :class="{ 'lg:max-w-196 lg:px-8': !side }"
      data-home
      @click="tapFree"
    >
      <StoreWarning
        v-if="data.storageError"
        class="mx-3 mt-1 mb-1"
        :class="{ 'lg:mx-0 lg:mt-0 lg:mb-2': !side }"
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
