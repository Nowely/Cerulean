<script setup lang="ts">
// The slot left of a record: a working checkbox (pages with «Готово» and all subitems),
// a 6px ring dot (pages without «Готово»), or the record's own glyph (its coloured tile only on its own page)
import { computed } from 'vue'
import type { Page, Rec } from '~/domain/types'
import { isListPage } from '~/domain/auto'
import PageTile from './PageTile.vue'

const props = withDefaults(defineProps<{
  rec: Rec
  page: Page | undefined
  /** 18 in cards, 20 in rows, 24 on a record page */
  size?: 'sm' | 'md' | 'lg'
  /** Hit area around the mark; rows use the full 44 */
  area?: 'row' | 'tight'
  /** A row is one Tab stop (its text); the mark stays clickable */
  tabbable?: boolean
}>(), { size: 'md', area: 'row', tabbable: true })

const emit = defineEmits<{ toggle: [] }>()

const kind = computed(() => {
  if (props.rec.glyph) return 'tile'
  if (props.rec.parentId || props.page?.hasDone) return 'check'
  return 'dot'
})
/** On a shopping list a ticked thing is bought, and a tap puts it back on the list (v22, N9) */
const label = computed(() => `${props.rec.done && props.page && isListPage(props.page) ? 'Купить снова' : 'Отметить'} «${props.rec.text}»`)
const circle = computed(() => ({ sm: 'size-4.5', md: 'size-5', lg: 'size-6' }[props.size]))
const tick = computed(() => ({ sm: 'size-2.5', md: 'size-3', lg: 'size-3.5' }[props.size]))
const box = computed(() => props.area === 'row' ? 'size-11' : 'size-10 lg:size-9')
</script>

<template>
  <button
    v-if="kind === 'check'"
    type="button"
    role="checkbox"
    :aria-checked="rec.done"
    :aria-label="label"
    :tabindex="tabbable ? undefined : -1"
    class="group/mark relative flex shrink-0 cursor-pointer items-center justify-center rounded-full"
    :class="box"
    @click.stop="emit('toggle')"
  >
    <span
      class="flex items-center justify-center rounded-full border-[1.5px] transition-colors duration-150"
      :class="[circle, rec.done ? 'border-toned bg-toned text-on-accent' : 'border-ring group-hover/mark:border-toned group-active/mark:bg-pressed']"
    >
      <svg
        v-if="rec.done"
        :class="tick"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      ><path d="M20 6 9 17l-5-5" /></svg>
    </span>
  </button>
  <span
    v-else
    class="flex shrink-0 items-center justify-center"
    :class="box"
    aria-hidden="true"
  >
    <PageTile
      v-if="kind === 'tile'"
      :glyph="rec.glyph"
      :color="rec.color ?? page?.color"
      :size="size === 'lg' ? 36 : 18"
      :tile="size === 'lg'"
    />
    <span
      v-else
      class="size-1.5 rounded-full bg-ring"
    />
  </span>
</template>
