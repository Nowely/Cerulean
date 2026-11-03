<script setup lang="ts">
// Главная (main flow, items 1, 9, 16–20): Входящие and Сегодня at the top with no caption, then Избранное once a page
// of the person's own is starred, «Мои страницы» with its «+», and the person's sections, as quiet folding captions.
// Nothing describes anything: an empty page is its name. The field is docked at the bottom; after a send it stays open
// for the next record and a tap on Главная's free space puts it away.
// The phone shows it as its first screen (pages/index.vue); a computer keeps it as the left column beside the open page,
// on the column's own surface (computer delta, items 1, 3), the same pane with the same field.
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import type { Id, Page } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useCreatePage } from '~/composables/useCreatePage'
import { useHomeField, useSide } from '~/composables/useSide'
import { useNotify } from '~/composables/useNotify'
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
const pagesOf = (sectionId: Id) => data.homePages(sectionId)
const today = computed(() => data.livePages.find(p => p.kind === 'today'))

const recentOpen = computed(() => data.settings.folded.includes('recent:expanded'))
const recent = computed(() => data.homePages(null).filter(p => p.favorite === null))
const recentShown = computed(() => recentOpen.value ? recent.value : recent.value.slice(0, RECENT_SHOWN))
const sections = computed(() => data.sectionList.map(s => ({ section: s, pages: pagesOf(s.id) })))

type DragBox = { id: Id | null, top: number, bottom: number, left: number, right: number, headerBottom: number, rows: { id: Id, top: number, bottom: number }[] }
const dragging = ref<Id | null>(null)
const shifts = ref<Record<Id, number>>({})
const dropLine = ref<{ top: number, left: number, width: number } | null>(null)
let boxes: DragBox[] = []
let destination: { section: Id | null, before: Id | null } | null = null
let height = 0

function startDrag(page: Page, x: number, y: number, h: number) {
  dragging.value = page.id
  height = h + (compact.value ? 0 : 2)
  boxes = [...document.querySelectorAll<HTMLElement>('[data-home-section]')].map((el) => {
    const rect = el.getBoundingClientRect()
    const header = el.querySelector('h2')?.parentElement?.getBoundingClientRect()
    return {
      id: el.dataset.homeSection || null, top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
      headerBottom: header?.bottom ?? rect.top,
      rows: [...el.querySelectorAll<HTMLElement>('[data-home-page]')].map((row) => {
        const r = row.getBoundingClientRect()
        return { id: row.dataset.homePage!, top: r.top, bottom: r.bottom }
      })
    }
  })
  moveDrag(x, y)
}
function moveDrag(x: number, y: number) {
  const scroller = screen.value?.scroller?.getBoundingClientRect()
  if (!dragging.value || !scroller || y < scroller.top || y > scroller.bottom) {
    destination = null
    dropLine.value = null
    shifts.value = {}
    return
  }
  const candidates = boxes.filter(b => x >= b.left && x <= b.right)
  if (!candidates.length || y < candidates[0]!.top || y > candidates.at(-1)!.bottom) {
    destination = null
    dropLine.value = null
    shifts.value = {}
    return
  }
  const box = candidates.find(b => y >= b.top && y <= b.bottom)
    ?? candidates.reduce<DragBox | undefined>((best, b) => !best || Math.abs(y - b.top) < Math.abs(y - best.top) ? b : best, undefined)
  if (!box) {
    destination = null
    dropLine.value = null
    shifts.value = {}
    return
  }
  const rows = box.rows.filter(r => r.id !== dragging.value)
  const next = y <= box.headerBottom ? rows[0] : rows.find(r => y < (r.top + r.bottom) / 2)
  let before = next?.id ?? null
  if (!rows.length && y <= box.headerBottom) before = data.homePages(box.id).find(p => p.id !== dragging.value)?.id ?? null
  if (!next && box.id === null && rows.length) {
    const all = data.homePages(null).filter(p => p.id !== dragging.value)
    const last = all.findIndex(p => p.id === rows.at(-1)!.id)
    before = last < 0 ? null : all[last + 1]?.id ?? null
  }
  destination = { section: box.id, before }
  const top = next?.top ?? rows.at(-1)?.bottom ?? box.headerBottom
  dropLine.value = { top, left: box.left, width: box.right - box.left }
  const source = boxes.find(b => b.rows.some(r => r.id === dragging.value))
  const from = source?.rows.findIndex(r => r.id === dragging.value) ?? -1
  const nextShifts: Record<Id, number> = {}
  for (const b of boxes) for (const [i, row] of b.rows.entries()) {
    if (row.id === dragging.value) continue
    let shift = b === source && i > from ? -height : 0
    if (b === box && (!next || row.top >= next.top)) shift += height
    if (shift) nextShifts[row.id] = shift
  }
  shifts.value = nextShifts
}
let releaseGuard: (() => void) | undefined
function guardReleaseClick() {
  releaseGuard?.()
  const cleanup = () => {
    clearTimeout(timer)
    document.removeEventListener('pointerdown', cleanup, true)
    document.removeEventListener('click', suppress, true)
    releaseGuard = undefined
  }
  const suppress = (e: MouseEvent) => {
    e.preventDefault()
    e.stopImmediatePropagation()
    cleanup()
  }
  releaseGuard = cleanup
  document.addEventListener('pointerdown', cleanup, true)
  document.addEventListener('click', suppress, true)
  const timer = setTimeout(cleanup, 500)
}
const notify = useNotify()
function endDrag() {
  guardReleaseClick()
  const id = dragging.value
  const target = destination
  cancelDrag()
  if (!id || !target) return
  const result = data.placeHomePage(id, target.section, target.before)
  if (result && result.from !== target.section) {
    const name = target.section ? data.sections[target.section]?.name : 'Мои страницы'
    notify(`Перемещено в ${name}`, { label: 'Отменить', run: result.undo })
  }
}
function cancelDrag() {
  dragging.value = null
  shifts.value = {}
  dropLine.value = null
  destination = null
  boxes = []
}
onBeforeUnmount(() => releaseGuard?.())

function addSection() {
  ui.renameSection = data.createSection('Новая секция').id
}

function addFavorite() {
  const page = create()
  data.toggleFavorite({ kind: 'page', id: page.id })
}

function disableLeaving(el: Element) {
  if (el instanceof HTMLElement) el.inert = true
}
function enableEntering(el: Element) {
  if (el instanceof HTMLElement) el.inert = false
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
    home
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
          @add="addFavorite"
        />
        <Transition
          name="mf3-fold"
          @before-enter="enableEntering"
          @before-leave="disableLeaving"
        >
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
                :dragging="dragging === f.page.id"
                @drag-start="startDrag"
                @drag-move="moveDrag"
                @drag-end="endDrag"
                @drag-cancel="cancelDrag"
              />
              <HomeRow
                v-else
                :rec="f.rec"
                :compact="compact"
              />
            </template>
          </div>
        </Transition>
      </section>

      <!-- Мои страницы: pages without a section, newest first, five rows and «Ещё N»; «+» makes a page (item 16) -->
      <section
        aria-labelledby="cap-recent"
        data-home-section=""
      >
        <HomeCaption
          id="recent"
          name="Мои страницы"
          :folded="folded('recent')"
          :count="recent.length"
          :compact="compact"
          @toggle="data.toggleFolded('recent')"
          @add="create()"
        />
        <Transition
          name="mf3-fold"
          @before-enter="enableEntering"
          @before-leave="disableLeaving"
        >
          <div v-if="!folded('recent')">
            <div role="list">
              <HomeRow
                v-for="p in recentShown"
                :key="p.id"
                :page="p"
                :compact="compact"
                :dragging="dragging === p.id"
                :drag-shift="shifts[p.id]"
                @drag-start="startDrag"
                @drag-move="moveDrag"
                @drag-end="endDrag"
                @drag-cancel="cancelDrag"
              />
            </div>
            <button
              v-if="recent.length > RECENT_SHOWN"
              type="button"
              class="flex min-h-8 w-full cursor-pointer items-center gap-1 rounded-card pr-2 pl-15 text-left text-sm text-toned hover:bg-muted active:bg-pressed"
              :class="{ 'pl-9.5': compact }"
              :aria-expanded="recentOpen"
              @click="data.toggleFolded('recent:expanded')"
            >
              {{ recentOpen ? 'Свернуть' : `Ещё ${recent.length - RECENT_SHOWN}` }}
              <UIcon
                name="i-lucide-chevron-right"
                class="size-3.5 text-dimmed transition-transform duration-150"
                :class="recentOpen ? '-rotate-90' : ''"
              />
            </button>
          </div>
        </Transition>
      </section>

      <section
        v-for="{ section: s, pages } in sections"
        :key="s.id"
        :aria-labelledby="`cap-${s.id}`"
        :data-home-section="s.id"
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
          @add="create({ sectionId: s.id })"
        />
        <Transition
          name="mf3-fold"
          @before-enter="enableEntering"
          @before-leave="disableLeaving"
        >
          <div
            v-if="!s.collapsed"
            role="list"
          >
            <HomeRow
              v-for="p in pages"
              :key="p.id"
              :page="p"
              :compact="compact"
              :dragging="dragging === p.id"
              :drag-shift="shifts[p.id]"
              @drag-start="startDrag"
              @drag-move="moveDrag"
              @drag-end="endDrag"
              @drag-cancel="cancelDrag"
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
        </Transition>
      </section>

      <!-- A month after the last copy, while the browser may clear the data (v22 item 27); never on day one -->
      <CopyRow :compact="compact" />
    </div>

    <Teleport to="body">
      <div
        v-if="dropLine"
        class="pointer-events-none fixed z-49 h-0.5 rounded-full bg-accent"
        :style="{ top: `${dropLine.top}px`, left: `${dropLine.left}px`, width: `${dropLine.width}px` }"
        data-home-drop-line
      />
    </Teleport>

    <template #dock>
      <FlowField
        ref="field"
        mode="home"
      />
    </template>
  </AppScreen>
</template>
