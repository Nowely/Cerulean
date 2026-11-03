<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useBackLayer } from '~/composables/useBackLayer'
import type { MenuItem } from '../overlay/ActionMenu.vue'

const props = defineProps<{ title: string, rect: DOMRect, down: boolean, offset: { x: number, y: number } | null, items: MenuItem[][] }>()
const emit = defineEmits<{ close: [], open: [] }>()
useBackLayer(() => true, () => emit('close'))
const above = computed(() => props.rect.top + props.rect.height / 2 > window.innerHeight / 2)
const rowStyle = computed(() => ({ left: `${props.rect.left}px`, top: `${props.rect.top}px`, width: `${props.rect.width}px`, transform: props.offset ? `translate(${props.offset.x}px, ${props.offset.y}px) scale(1.04)` : 'scale(1.02)' }))
const menuStyle = computed(() => ({
  left: `${Math.max(8, Math.min(props.rect.left + 44, window.innerWidth - 288))}px`,
  top: `${above.value ? props.rect.top - 6 : props.rect.bottom + 6}px`,
  maxHeight: `${Math.max(0, above.value ? props.rect.top - 14 : window.innerHeight - props.rect.bottom - 14)}px`,
  transform: above.value ? 'translateY(-100%)' : undefined
}))
function select(item: MenuItem) {
  emit('close')
  item.onSelect()
}
function key(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', key))
onBeforeUnmount(() => document.removeEventListener('keydown', key))
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50"
      :class="{ 'pointer-events-none': down }"
      data-record-hold
    >
      <button
        type="button"
        aria-label="Закрыть меню записи"
        tabindex="-1"
        class="absolute inset-0 cursor-default bg-canvas/55 backdrop-blur-[6px]"
        data-record-hold-veil
        :class="{ 'opacity-0': offset }"
        @click="emit('close')"
      />
      <div
        role="button"
        tabindex="0"
        :aria-label="`Открыть «${title}»`"
        class="record-held absolute select-none rounded-chip bg-elev shadow-float ring ring-line [-webkit-touch-callout:none]"
        :style="rowStyle"
        data-record-held-row
        @click="emit('open')"
        @keydown.enter.prevent="emit('open')"
        @contextmenu.prevent
      >
        <div
          class="pointer-events-none"
          aria-hidden="true"
        >
          <slot />
        </div>
      </div>
      <div
        v-if="!offset"
        role="menu"
        :aria-label="`Действия: ${title}`"
        class="absolute w-70 overflow-y-auto rounded-[14px] border border-line bg-elev p-1.5 shadow-float dark:border-line2"
        :style="menuStyle"
        data-record-hold-menu
      >
        <template
          v-for="(group, index) in items"
          :key="index"
        >
          <div
            v-if="index"
            class="mx-1 my-1.5 h-px bg-line"
            role="separator"
          />
          <button
            v-for="item in group"
            :key="item.label"
            type="button"
            role="menuitem"
            class="flex min-h-11 w-full items-center gap-3 rounded-item px-2.5 text-left text-15 focus-visible:bg-hover active:bg-pressed"
            :class="item.danger ? 'text-warn-ink' : 'text-highlighted'"
            @click="select(item)"
          >
            <UIcon
              :name="item.icon"
              class="size-4.5 shrink-0"
            />{{ item.label }}
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .record-held { animation: record-lift 150ms ease-out; }
}
@keyframes record-lift {
  from { transform: scale(1); }
}
</style>
