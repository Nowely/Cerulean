<script setup lang="ts">
// A page on Главная: bare glyph, name with its status on the same line, the summary under it at full width.
// Compact is its own list: 32px rows, no status text, only a dot on the glyph where the status would be loud.
// The row's right end belongs to the page «⋯» (hover and keyboard focus on desktop); on a phone a long press
// opens the same menu.
import { computed, ref, useTemplateRef } from 'vue'
import { useRouter } from '#imports'
import { useElementSize } from '@vueuse/core'
import { useTextFit } from '~/composables/useTextFit'
import { fitNames } from '~/domain/fit'
import type { Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { useScreen } from '~/composables/useScreen'
import { pageBadge, pageSummary, recordBadge, recordSummary, type Badge, type Summary } from '~/domain/summary'
import { pageColor } from '~/domain/look'
import PageTile from '../common/PageTile.vue'
import CountBadge from '../common/CountBadge.vue'
import DotsButton from '../common/DotsButton.vue'
import PageMenu from '../page/PageMenu.vue'

const props = defineProps<{
  page?: Page
  rec?: Rec
  compact?: boolean
  /** Сегодня is on screen and says «просрочено» for this page: the row leaves it out */
  quiet?: boolean
}>()
const data = useDataStore()
const now = useNow()
const router = useRouter()
const { isDesktop } = useScreen()

const to = computed(() => props.page ? `/p/${props.page.id}` : `/r/${props.rec!.id}`)
const name = computed(() => props.page ? props.page.title || 'Без названия' : props.rec!.text)
const glyph = computed(() => props.page ? props.page.glyph : props.rec!.glyph ?? 'doc')
const summary = computed<Summary>(() => props.page
  ? pageSummary(props.page, data.recordsOf(props.page.id), now.value, data.liveRecords)
  : recordSummary(data.subitemsOf(props.rec!.id), now.value))
const badge = computed<Badge | null>(() => props.page
  ? pageBadge(props.page, data.recordsOf(props.page.id), now.value, data.liveRecords, { late: !props.quiet })
  : recordBadge(data.subitemsOf(props.rec!.id), now.value, { late: !props.quiet }))
/**
 * The summary measured against its own column (v24 fixes, 9, 10): whole names go from the end until the line fits,
 * «+N» counts every name not shown, and with no room for one name the count stands alone. Up to three names on offer
 */
const summaryEl = useTemplateRef<HTMLElement>('summaryEl')
const { width } = useElementSize(summaryEl)
const fit = useTextFit()
const summaryLine = computed(() => {
  const s = summary.value
  const el = summaryEl.value
  if (!s.list?.length || !el || !width.value) return null
  void fit.fonts.value
  const measure = fit.measurer(el)
  return fitNames(s.lead, s.list, s.total ?? s.list.length, line => measure(line) <= width.value + 0.5)
})
/** Compact: the one signal left is a dot on the glyph's corner, only where the status would be coloured */
const dot = computed(() => props.compact && badge.value && badge.value.tone !== 'new' ? badge.value.tone : null)

// A long press on a phone opens the page menu; the click that follows it must not open the page
const menuOpen = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let pressed = false
function down(e: PointerEvent) {
  // A long press is followed by no click on most phones: any next press starts afresh
  pressed = false
  if (isDesktop.value || !props.page || e.pointerType === 'mouse') return
  timer = setTimeout(() => {
    pressed = true
    menuOpen.value = true
    navigator.vibrate?.(10)
  }, 500)
}
function up() {
  clearTimeout(timer)
}
function click(e: MouseEvent) {
  if (pressed) {
    e.preventDefault()
    pressed = false
    return
  }
  e.preventDefault()
  void router.push(to.value)
}
</script>

<template>
  <!-- Lit by hover and keyboard focus only: focus given back by a closed sheet leaves it plain (v23, F18) -->
  <div
    role="listitem"
    class="group/row relative flex items-center rounded-card hover:bg-muted has-focus-visible:bg-muted lg:rounded-chip"
  >
    <a
      :href="to"
      class="flex min-w-0 flex-1 select-none items-center gap-3 rounded-card px-2 text-left [-webkit-touch-callout:none] active:bg-pressed lg:rounded-chip lg:px-3"
      :class="compact ? 'min-h-8' : 'min-h-12 py-0.75 lg:min-h-13'"
      @click="click"
      @pointerdown="down"
      @pointerup="up"
      @pointercancel="up"
      @pointerleave="up"
      @contextmenu="page && !isDesktop && $event.preventDefault()"
    >
      <span class="relative flex size-4.5 shrink-0 items-center justify-center">
        <PageTile
          :glyph="glyph"
          :color="pageColor(page)"
          :size="compact ? 16 : 18"
          tint
        />
        <span
          v-if="dot"
          class="absolute -top-0.5 -right-0.75 size-2 rounded-full ring-2 ring-canvas"
          :class="dot === 'warn' ? 'bg-warn' : 'bg-accent'"
          aria-hidden="true"
        />
      </span>
      <span class="flex min-w-0 flex-1 flex-col gap-px">
        <span class="flex min-w-0 items-center gap-2">
          <span
            class="min-w-0 truncate"
            :class="[
              compact ? 'text-15 leading-5 text-highlighted lg:text-sm' : 'text-base leading-5.5 font-medium text-highlighted lg:text-sm lg:leading-5',
              { 'text-dimmed': page && !page.title }
            ]"
          >{{ name }}</span>
          <CountBadge
            v-if="badge"
            :badge="badge"
            :class="{ 'sr-only': compact }"
          />
        </span>
        <span
          v-if="!compact && (summary.lead || summary.names)"
          ref="summaryEl"
          class="flex min-w-0 text-sm leading-4.75 text-toned lg:leading-5"
        >
          <span
            v-if="summaryLine !== null"
            class="min-w-0 truncate"
          >{{ summaryLine }}</span>
          <span
            v-else-if="summary.lead"
            class="shrink-0"
            :class="{ 'min-w-0 truncate': !summary.names }"
          >{{ summary.lead }}</span>
          <template v-if="summaryLine === null">
            <span
              v-if="summary.lead && summary.names"
              class="shrink-0"
            >&nbsp;·&nbsp;</span>
            <span
              v-if="summary.names"
              class="min-w-0 truncate"
            >{{ summary.names }}</span>
            <span
              v-if="summary.more"
              class="shrink-0"
            >&nbsp;+{{ summary.more }}</span>
          </template>
        </span>
      </span>
    </a>
    <PageMenu
      v-if="page && page.kind !== 'today'"
      v-model:open="menuOpen"
      :page="page"
      home
      :bare="!isDesktop"
    >
      <!-- In compact the 36px button overhangs the 32px row instead of making it taller -->
      <DotsButton
        label="Действия со страницей"
        class="mr-1 opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 aria-expanded:opacity-100"
        :class="{ '-my-0.5': compact }"
      />
    </PageMenu>
  </div>
</template>
