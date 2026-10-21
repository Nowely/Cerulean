<script setup lang="ts">
// «Значок и цвет» (v23, A9, M10): an icon found by a Russian word («маш» → Машина) among 35, six to a row on a phone
// and eight on desktop, then the page's colour: «Без цвета» first (the default, the muted swatch) and seven colours.
// Each tap applies at once and the sheet stays. A sheet on a phone; on desktop a popover at the page «⋯» when it was
// opened from there (`anchor`), else at its own trigger. No ×: a tap outside, a swipe down or Esc closes it.
import { computed, ref, useTemplateRef, watch } from 'vue'
import { COLOR_NAMES, GLYPHS, type Glyph, type PageColor } from '~/domain/types'
import { findGlyphs, PAGE_CHOICES } from '~/domain/look'
import { useScreen } from '~/composables/useScreen'
import { useLater } from '~/composables/useLater'

const props = defineProps<{
  glyph: Glyph | null | undefined
  /** The page's chosen colour (`pageColor`), null for «Без цвета» */
  color: PageColor | null
  /** The page's name, under the title */
  title: string
  /** Desktop: the button the popover stands at (the page «⋯» it was opened from) */
  anchor?: HTMLElement | null
}>()
const emit = defineEmits<{ change: [patch: { glyph?: Glyph, color?: PageColor | null }] }>()
const open = defineModel<boolean>('open', { default: false })
const { isDesktop } = useScreen()
const later = useLater()

const q = ref('')
watch(open, (v) => {
  if (v) q.value = ''
})
const icons = computed(() => findGlyphs(q.value))
const current = computed(() => props.glyph ?? 'doc')
/** The selected icon shows in the page's colour, or neutral without one */
const tint = computed(() => props.color ? `var(--c-${props.color})` : 'var(--muted)')
const swatch = (c: PageColor | null) => c ? `var(--c-${c})` : 'var(--muted)'

const field = useTemplateRef<{ inputRef?: HTMLInputElement | null }>('field')
/** What opens it here (the page tile, «Добавить значок») */
const wrap = useTemplateRef<HTMLElement>('wrap')
/**
 * Desktop: the popover stands at the «⋯» it was opened from while that is on screen, else at its own trigger. The
 * trigger stays outside the popover, so the popover is named by its own title, not by the button
 */
const reference = computed(() => {
  if (!isDesktop.value) return undefined
  return props.anchor?.isConnected ? props.anchor : wrap.value?.querySelector<HTMLElement>('button') ?? undefined
})

function openNow() {
  open.value = true
  void later.load()
}
</script>

<template>
  <span
    v-if="$slots.default"
    ref="wrap"
    class="contents"
    @click="openNow"
  >
    <slot />
  </span>
  <LazyUPopover
    v-if="isDesktop && (later.ready.value || open)"
    v-model:open="open"
    :reference="reference"
    :content="{
      // Right edges line up under the «⋯»; under the tile it opens from its left edge
      'align': anchor?.isConnected ? 'end' : 'start',
      'sideOffset': 6,
      'collisionPadding': 12,
      'aria-label': `Значок и цвет: ${title}`,
      // Typing finds an icon at once; closing gives focus back to where it was opened
      'onOpenAutoFocus': (e: Event) => { e.preventDefault(); field?.inputRef?.focus() },
      'onCloseAutoFocus': (e: Event) => { e.preventDefault(); reference?.focus() }
    }"
  >
    <template #content>
      <div class="w-98 px-3 pt-3 pb-3.5">
        <div class="px-1 pb-2.5">
          <h2 class="truncate text-15 font-semibold text-highlighted">
            Значок и цвет
          </h2>
          <p class="truncate text-sm text-toned">
            {{ title }}
          </p>
        </div>
        <UInput
          ref="field"
          v-model="q"
          icon="i-lucide-search"
          variant="soft"
          size="lg"
          placeholder="Найти значок: дом, книга…"
          aria-label="Найти значок"
          autocomplete="off"
          class="w-full"
        >
          <template
            v-if="q"
            #trailing
          >
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              square
              size="xs"
              aria-label="Очистить"
              @click="q = ''"
            />
          </template>
        </UInput>
        <div
          class="grid grid-cols-8 gap-1 pt-2"
          role="group"
          aria-label="Значок"
        >
          <UTooltip
            v-for="x in icons"
            :key="x.glyph"
            :text="x.name"
          >
            <button
              type="button"
              class="flex size-10 cursor-pointer items-center justify-center rounded-chip"
              :class="x.glyph === current ? '' : 'text-toned hover:bg-hover hover:text-highlighted'"
              :style="x.glyph === current ? { background: `var(--b-${color ?? 'gray'})`, color: tint, boxShadow: `inset 0 0 0 1.5px ${tint}` } : undefined"
              :aria-label="x.name"
              :aria-pressed="x.glyph === current"
              @click="emit('change', { glyph: x.glyph })"
            >
              <UIcon
                :name="GLYPHS[x.glyph]"
                class="size-5"
              />
            </button>
          </UTooltip>
        </div>
        <p
          v-if="!icons.length"
          class="px-1 pt-3.5 pb-0.5 text-15 text-toned"
        >
          Такого значка нет. Попробуй другое слово.
        </p>
        <p class="px-1 pt-3.5 pb-0.5 text-cap text-toned">
          Цвет
        </p>
        <div
          class="flex gap-1.5 pt-1"
          role="group"
          aria-label="Цвет"
        >
          <UTooltip
            v-for="c in PAGE_CHOICES"
            :key="c ?? 'none'"
            :text="c ? COLOR_NAMES[c] : 'Без цвета'"
          >
            <button
              type="button"
              class="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-hover"
              :aria-label="c ? COLOR_NAMES[c] : 'Без цвета'"
              :aria-pressed="c === color"
              @click="emit('change', { color: c })"
            >
              <span
                class="size-5.5 rounded-full"
                :style="{ background: swatch(c), boxShadow: c === color ? `0 0 0 2px var(--elev), 0 0 0 4px ${swatch(c)}` : undefined }"
              />
            </button>
          </UTooltip>
        </div>
      </div>
    </template>
  </LazyUPopover>
  <LazyUDrawer
    v-if="!isDesktop && (later.ready.value || open)"
    v-model:open="open"
    title="Значок и цвет"
    :description="title"
    :content="{ onOpenAutoFocus: (e: Event) => e.preventDefault() }"
  >
    <template #content>
      <div class="flex max-h-[85dvh] flex-col pb-[max(env(safe-area-inset-bottom),1.375rem)]">
        <div class="shrink-0 pt-0.5 pr-2 pl-6">
          <h2 class="truncate text-sheet text-highlighted">
            Значок и цвет
          </h2>
          <p class="truncate text-sm text-toned">
            {{ title }}
          </p>
        </div>
        <div class="shrink-0 px-3 pt-3 pb-1">
          <UInput
            v-model="q"
            icon="i-lucide-search"
            variant="soft"
            size="lg"
            placeholder="Найти значок: дом, книга…"
            aria-label="Найти значок"
            autocomplete="off"
            class="w-full"
          >
            <template
              v-if="q"
              #trailing
            >
              <UButton
                icon="i-lucide-x"
                variant="ghost"
                square
                size="sm"
                aria-label="Очистить"
                @click="q = ''"
              />
            </template>
          </UInput>
        </div>
        <div
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          data-vaul-no-drag
        >
          <div
            class="grid grid-cols-6 gap-x-1.5 gap-y-1 px-3 pt-1.5"
            role="group"
            aria-label="Значок"
          >
            <button
              v-for="x in icons"
              :key="x.glyph"
              type="button"
              class="flex h-12 cursor-pointer items-center justify-center rounded-card"
              :class="x.glyph === current ? '' : 'text-toned active:bg-pressed'"
              :style="x.glyph === current ? { background: `var(--b-${color ?? 'gray'})`, color: tint, boxShadow: `inset 0 0 0 1.5px ${tint}` } : undefined"
              :aria-label="x.name"
              :aria-pressed="x.glyph === current"
              @click="emit('change', { glyph: x.glyph })"
            >
              <UIcon
                :name="GLYPHS[x.glyph]"
                class="size-5.5"
              />
            </button>
          </div>
          <p
            v-if="!icons.length"
            class="px-6 pt-3.5 text-15 text-toned"
          >
            Такого значка нет. Попробуй другое слово.
          </p>
          <p class="px-6 pt-3.5 pb-0.5 text-cap text-toned">
            Цвет
          </p>
          <div
            class="flex justify-between px-3.5"
            role="group"
            aria-label="Цвет"
          >
            <button
              v-for="c in PAGE_CHOICES"
              :key="c ?? 'none'"
              type="button"
              class="flex size-11 cursor-pointer items-center justify-center"
              :aria-label="c ? COLOR_NAMES[c] : 'Без цвета'"
              :aria-pressed="c === color"
              @click="emit('change', { color: c })"
            >
              <span
                class="size-6 rounded-full"
                :style="{ background: swatch(c), boxShadow: c === color ? `0 0 0 2px var(--elev), 0 0 0 4px ${swatch(c)}` : undefined }"
              />
            </button>
          </div>
        </div>
      </div>
    </template>
  </LazyUDrawer>
</template>
