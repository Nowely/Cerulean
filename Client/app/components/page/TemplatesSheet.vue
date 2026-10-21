<script setup lang="ts">
// «Шаблоны» of a page (v24, И9, И7), from its «⋯»: a content-sized sheet on a phone (the page name under the title,
// 22pt under the rows); on desktop a 340px popover at that «⋯» (D1). A row is the stamp, the template's name and what
// it brings; a tap opens the template. Its «+» (44 on a phone, 36 with a tooltip on desktop, D7) aims the page's
// composer at the template for one record. No ×: a tap outside, a swipe down or Esc closes it.
import { computed } from 'vue'
import { useRouter } from '#imports'
import type { Id, Page } from '~/domain/types'
import { useScreen } from '~/composables/useScreen'
import { useTemplates } from '~/composables/useTemplates'
import { templateBrings } from '~/domain/recordTemplates'
import { UDrawer, UPopover, UTooltip } from '#components'

const props = defineProps<{
  page: Page
  /** Desktop: the page «⋯» the menu gave the focus back to */
  anchor: HTMLElement | null
}>()
const open = defineModel<boolean>('open', { default: false })
const { isDesktop } = useScreen()
const router = useRouter()
const templates = useTemplates()

const name = computed(() => props.page.title || 'Без названия')
const rows = computed(() => (props.page.templates ?? []).map(t => ({ id: t.id, name: t.name, brings: templateBrings(t) })))
const reference = computed(() => isDesktop.value && props.anchor?.isConnected ? props.anchor : undefined)

// What a row asked for runs once the sheet is gone and focus is back, so the composer keeps the caret it takes
let pending: (() => void) | null = null
let fallback: ReturnType<typeof setTimeout> | undefined
function after(run: () => void) {
  pending = run
  open.value = false
  clearTimeout(fallback)
  fallback = setTimeout(closed, 800)
}
function closed() {
  clearTimeout(fallback)
  const run = pending
  pending = null
  run?.()
}

const openTemplate = (id: Id) => after(() => void router.push(`/t/${id}`))
const use = (id: Id) => after(() => templates.use(props.page.id, id))

const row = 'flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-chip px-2 py-1 text-left hover:bg-muted active:bg-pressed lg:min-h-11 lg:gap-2.5'
</script>

<template>
  <component
    :is="reference ? UPopover : UDrawer"
    v-model:open="open"
    v-bind="reference
      ? {
        reference,
        content: { 'side': 'bottom', 'align': 'end', 'sideOffset': 6, 'collisionPadding': 12, 'aria-label': `Шаблоны: ${name}`, 'onCloseAutoFocus': closed }
      }
      : { title: 'Шаблоны', content: { 'aria-label': `Шаблоны: ${name}`, 'onCloseAutoFocus': closed } }"
  >
    <template #content>
      <div :class="reference ? 'w-85 px-1.5 pt-3 pb-1.5' : 'pb-5.5'">
        <div :class="reference ? 'px-2.5 pb-2' : 'flex min-h-11 flex-col justify-center pt-0.5 pr-2 pl-6'">
          <h2
            class="truncate text-highlighted"
            :class="reference ? 'text-15 font-semibold' : 'text-sheet'"
          >
            Шаблоны
          </h2>
          <p class="truncate text-sm text-toned">
            {{ name }}
          </p>
        </div>
        <ul :class="reference ? '' : 'px-2 pt-1'">
          <li
            v-for="t in rows"
            :key="t.id"
            class="flex items-center gap-0.5"
          >
            <button
              type="button"
              :class="row"
              :aria-label="`Открыть шаблон «${t.name}»`"
              @click="openTemplate(t.id)"
            >
              <UIcon
                name="cer:stamp"
                class="size-4.5 shrink-0 text-toned"
              />
              <span class="flex min-w-0 flex-1 flex-col gap-px">
                <span class="truncate text-base text-highlighted lg:text-15">{{ t.name }}</span>
                <span class="truncate text-13 text-toned">{{ t.brings }}</span>
              </span>
            </button>
            <component
              :is="reference ? UTooltip : 'span'"
              v-bind="reference ? { text: 'Запись по шаблону' } : { class: 'contents' }"
            >
              <button
                type="button"
                class="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-chip text-accent-ink hover:bg-muted active:bg-pressed lg:size-9"
                :aria-label="`Запись по шаблону «${t.name}»`"
                @click="use(t.id)"
              >
                <UIcon
                  name="i-lucide-plus"
                  class="size-5"
                />
              </button>
            </component>
          </li>
        </ul>
      </div>
    </template>
  </component>
</template>
