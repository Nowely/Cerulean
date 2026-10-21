<script setup lang="ts" generic="T extends string">
// 2–4 options that fit: theme, model, home rows, «Как показывать». A radio group, so arrows move the choice.
// v22 (G8, D1): when a label would be cut (a 320px phone), the control becomes one row that opens a list sheet.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import ActionMenu from '../overlay/ActionMenu.vue'

const props = withDefaults(defineProps<{
  options: { value: T, label: string, icon?: string }[]
  label: string
  size?: 'md' | 'lg'
}>(), { size: 'md' })

const model = defineModel<T>({ required: true })
const box = useTemplateRef<HTMLElement>('box')
const root = useTemplateRef<HTMLElement>('root')

function move(step: number) {
  const i = props.options.findIndex(o => o.value === model.value)
  const next = props.options[(i + step + props.options.length) % props.options.length]!
  model.value = next.value
  root.value?.querySelectorAll<HTMLButtonElement>('[role=radio]')[props.options.indexOf(next)]?.focus()
}

// Labels are measured while they show; once one is cut the row stays until the box grows past that width
const tight = ref(false)
let cutAt = 0
function measure() {
  const el = box.value
  if (!el) return
  if (tight.value) {
    if (el.clientWidth > cutAt) tight.value = false
    return
  }
  const cut = [...el.querySelectorAll<HTMLElement>('[data-seg-label]')].some(s => s.scrollWidth > s.clientWidth + 1)
  if (cut) {
    cutAt = el.clientWidth
    tight.value = true
  }
}
watch(tight, v => !v && nextTick(measure))
watch(() => props.options.map(o => o.label).join(), () => {
  tight.value = false
  void nextTick(measure)
})
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(measure)
  if (box.value) observer.observe(box.value)
  measure()
})
onBeforeUnmount(() => observer?.disconnect())

const current = computed(() => props.options.find(o => o.value === model.value) ?? props.options[0]!)
const sheet = computed(() => [props.options.map(o => ({
  label: o.label,
  icon: o.value === model.value ? 'i-lucide-circle-check' : 'i-lucide-circle',
  onSelect: () => {
    model.value = o.value
  }
}))])
</script>

<template>
  <div ref="box">
    <ActionMenu
      v-if="tight"
      :items="sheet"
      :title="label"
      :label="label"
    >
      <button
        type="button"
        class="hit-44 flex w-full cursor-pointer items-center gap-2 rounded-card bg-trk px-3 text-sm text-highlighted active:bg-pressed"
        :class="size === 'lg' ? 'h-11' : 'h-10'"
        :aria-label="`${label}: ${current.label}`"
        aria-haspopup="dialog"
      >
        <UIcon
          v-if="current.icon"
          :name="current.icon"
          class="size-4.5 shrink-0 text-accent"
        />
        <span class="min-w-0 flex-1 truncate text-left font-medium">{{ current.label }}</span>
        <UIcon
          name="i-lucide-chevrons-up-down"
          class="size-4 shrink-0 text-toned"
        />
      </button>
    </ActionMenu>
    <div
      v-else
      ref="root"
      role="radiogroup"
      :aria-label="label"
      class="flex gap-0.5 rounded-card bg-trk p-0.75"
      @keydown.right.prevent="move(1)"
      @keydown.down.prevent="move(1)"
      @keydown.left.prevent="move(-1)"
      @keydown.up.prevent="move(-1)"
    >
      <button
        v-for="o in options"
        :key="o.value"
        type="button"
        role="radio"
        :aria-checked="o.value === model"
        :tabindex="o.value === model ? 0 : -1"
        class="hit-44 relative flex min-w-0 flex-1 basis-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-chip px-0.5 text-sm transition-colors"
        :class="[
          size === 'lg' ? 'h-10' : 'h-9 lg:h-8',
          o.value === model ? 'bg-seg-on font-medium text-highlighted shadow-seg' : 'text-toned hover:text-highlighted active:bg-pressed'
        ]"
        @click="model = o.value"
      >
        <UIcon
          v-if="o.icon"
          :name="o.icon"
          class="size-4.5 shrink-0"
          :class="o.value === model ? 'text-accent' : ''"
        />
        <span
          data-seg-label
          class="truncate"
        >{{ o.label }}</span>
      </button>
    </div>
  </div>
</template>
