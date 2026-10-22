<script setup lang="ts">
// Where a record goes, as the field shows it (main flow, item 5): the place's name and a chevron, never «Авто». Tinted
// (accent-soft, accent-ink) when Авто chose it; the tint deepens for a moment when Авто changes its mind. A place picked by
// hand, the page the field is on and Входящие are plain. The chip never takes the focus, so the keyboard stays up.
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  name: string
  /** Авто chose it */
  auto?: boolean
  /** A row of the field's list: 30px, 14px, at most 132 */
  small?: boolean
}>(), { auto: false, small: false })

/** A new key restarts the deepening each time the place changes */
const flash = ref(0)
watch(() => props.name, (now, before) => {
  if (props.auto && now !== before) flash.value++
})
</script>

<template>
  <button
    :key="auto ? flash : 'plain'"
    type="button"
    class="relative inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full whitespace-nowrap font-medium after:absolute after:inset-x-0"
    :class="[
      small ? 'h-7.5 max-w-33 pr-1.5 pl-2.25 text-sm after:-inset-y-1.75' : 'h-9 max-w-41 pr-1.5 pl-2.75 text-15 after:-inset-y-1',
      auto ? 'bg-accent-soft text-accent-ink' : 'text-toned active:bg-pressed',
      auto && flash ? 'place-flash' : ''
    ]"
    aria-haspopup="dialog"
    @pointerdown.prevent
    @mousedown.prevent
  >
    <span class="truncate">{{ name }}</span>
    <UIcon
      name="i-lucide-chevron-down"
      class="shrink-0"
      :class="[small ? 'size-3' : 'size-3.25', auto ? '' : 'text-dimmed']"
    />
  </button>
</template>
