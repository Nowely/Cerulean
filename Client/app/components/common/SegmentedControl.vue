<script setup lang="ts" generic="T extends string">
// 2–4 options that fit: theme, model, home rows, «Как показывать». A radio group, so arrows move the choice.
import { useTemplateRef } from 'vue'

const props = withDefaults(defineProps<{
  options: { value: T, label: string, icon?: string }[]
  label: string
  size?: 'md' | 'lg'
}>(), { size: 'md' })

const model = defineModel<T>({ required: true })
const root = useTemplateRef<HTMLElement>('root')

function move(step: number) {
  const i = props.options.findIndex(o => o.value === model.value)
  const next = props.options[(i + step + props.options.length) % props.options.length]!
  model.value = next.value
  root.value?.querySelectorAll<HTMLButtonElement>('[role=radio]')[props.options.indexOf(next)]?.focus()
}
</script>

<template>
  <div
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
      <span class="truncate">{{ o.label }}</span>
    </button>
  </div>
</template>
