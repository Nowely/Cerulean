<script setup lang="ts">
// «Добавить значок»: an icon and a colour for a page or a record with its own page
import { GLYPH_LABELS, GLYPHS, PAGE_COLORS, type Glyph, type PageColor } from '~/domain/types'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'

const props = defineProps<{ glyph: Glyph | null | undefined, color: PageColor | null | undefined, removable?: boolean }>()
const emit = defineEmits<{ change: [patch: { glyph?: Glyph | null, color?: PageColor }] }>()
const open = defineModel<boolean>('open', { default: false })
const COLOR_NAMES: Record<PageColor, string> = {
  green: 'Зелёный', blue: 'Синий', brown: 'Коричневый', yellow: 'Жёлтый', pink: 'Розовый', purple: 'Фиолетовый', gray: 'Серый', teal: 'Бирюзовый'
}
const glyphs = Object.keys(GLYPHS) as Glyph[]
</script>

<template>
  <AdaptiveOverlay
    v-model:open="open"
    title="Значок"
    width="w-80"
  >
    <template #trigger>
      <slot />
    </template>
    <div class="px-2 pt-1">
      <p class="pb-1.5 text-caption text-toned">
        Цвет
      </p>
      <div
        class="flex flex-wrap gap-1.5"
        role="radiogroup"
        aria-label="Цвет"
      >
        <button
          v-for="c in PAGE_COLORS"
          :key="c"
          type="button"
          role="radio"
          :aria-checked="(props.color ?? 'gray') === c"
          :aria-label="COLOR_NAMES[c]"
          class="hit-44 relative flex size-9 cursor-pointer items-center justify-center rounded-chip border-2 lg:size-8"
          :class="(props.color ?? 'gray') === c ? 'border-accent' : 'border-transparent'"
          :style="{ background: `var(--b-${c})` }"
          @click="emit('change', { color: c })"
        >
          <span
            class="size-3 rounded-full"
            :style="{ background: `var(--c-${c})` }"
          />
        </button>
      </div>
      <p class="pt-3 pb-1.5 text-caption text-toned">
        Значок
      </p>
      <div class="grid grid-cols-7 gap-1 pb-2">
        <button
          v-for="g in glyphs"
          :key="g"
          type="button"
          :aria-label="GLYPH_LABELS[g]"
          :aria-pressed="props.glyph === g"
          class="flex aspect-square cursor-pointer items-center justify-center rounded-chip hover:bg-muted active:bg-pressed"
          :class="props.glyph === g ? 'bg-elevated' : ''"
          :style="{ color: `var(--c-${props.color ?? 'gray'})` }"
          @click="emit('change', { glyph: g }); open = false"
        >
          <UIcon
            :name="GLYPHS[g]"
            class="size-5"
          />
        </button>
      </div>
      <UButton
        v-if="removable && props.glyph"
        variant="ghost"
        color="error"
        class="mb-2"
        @click="emit('change', { glyph: null }); open = false"
      >
        Убрать значок
      </UButton>
    </div>
  </AdaptiveOverlay>
</template>
