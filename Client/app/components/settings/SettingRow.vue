<script setup lang="ts">
// One line of Настройки. On a phone: icon, name with a hint, the value on the right; a line that opens
// something (a sheet, a screen, a file picker) is one big button with a chevron, and choices go under the name.
// On desktop: name and hint on the left, the control on the right, hairlines between lines.
import { useScreen } from '~/composables/useScreen'

withDefaults(defineProps<{
  label: string
  icon: string
  hint?: string
  /** Desktop hint when it differs from the phone one */
  deskHint?: string
  hintTone?: 'warn'
  /** Phone: the value at the right end of the line */
  value?: string
  /** Phone: an accent value is what a tap does («Включить», «Сейчас») */
  valueTone?: 'accent'
  /** Phone: the whole line is a button */
  opens?: boolean
  /** Phone: a line that acts at once has no chevron */
  acts?: boolean
  /** Phone: the control goes under the name at full width (segmented choices) */
  below?: boolean
  tone?: 'warn'
}>(), { hint: undefined, deskHint: undefined, hintTone: undefined, value: undefined, valueTone: undefined, tone: undefined })
defineEmits<{ open: [] }>()
const { isDesktop } = useScreen()
</script>

<template>
  <div
    v-if="isDesktop"
    class="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-default py-3 first-of-type:border-t-0"
  >
    <div class="min-w-0 flex-[1_1_16rem]">
      <div
        class="text-15 font-medium"
        :class="tone === 'warn' ? 'text-warn-ink' : 'text-highlighted'"
      >
        {{ label }}
      </div>
      <p
        v-if="deskHint ?? hint"
        class="mt-0.5 text-sm leading-snug"
        :class="hintTone === 'warn' && !deskHint ? 'text-warn-ink' : 'text-toned'"
      >
        {{ deskHint ?? hint }}
      </p>
    </div>
    <slot />
    <slot name="after" />
  </div>

  <template v-else>
    <component
      :is="opens ? 'button' : 'div'"
      :type="opens ? 'button' : undefined"
      class="flex min-h-13 w-full items-center gap-3 px-5 py-2 text-left"
      :class="[opens ? 'cursor-pointer active:bg-pressed' : '', tone === 'warn' ? 'text-warn-ink' : 'text-highlighted']"
      @click="opens && $emit('open')"
    >
      <UIcon
        :name="icon"
        class="size-5 shrink-0"
        :class="tone === 'warn' ? '' : 'text-toned'"
      />
      <span class="min-w-0 flex-1">
        <span class="block text-base">{{ label }}</span>
        <span
          v-if="hint"
          class="mt-0.5 block text-13 leading-snug"
          :class="hintTone === 'warn' ? 'text-warn-ink' : 'text-toned'"
        >{{ hint }}</span>
      </span>
      <span
        v-if="value"
        class="max-w-[45%] shrink-0 truncate text-15"
        :class="valueTone === 'accent' ? 'text-accent-ink' : 'text-toned'"
      >{{ value }}</span>
      <slot v-if="!opens && !below" />
      <UIcon
        v-if="opens && !acts && tone !== 'warn'"
        name="i-lucide-chevron-right"
        class="size-4 shrink-0 text-dimmed"
      />
    </component>
    <div
      v-if="below && !opens"
      class="pr-5 pb-2.5 pl-13"
    >
      <slot />
    </div>
    <slot name="after" />
  </template>
</template>
