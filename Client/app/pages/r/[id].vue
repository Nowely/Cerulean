<script setup lang="ts">
// A record opened from navigation: full, with nothing docked at the bottom (main flow, item 13): its text is written in
// place and subitems are added with «+ Подпункт». While the text has focus the editing bar is docked (v23).
// On a computer it opens on the right in place of the page it was opened from (computer delta, items 4, 16, 17):
// «‹ <page>» at the column's top-left and «⋯» at the window's top-right; no third panel, and the bar only for a selection,
// «@» or an address; Esc ends editing and the next Esc goes back
import { computed, onUnmounted, useTemplateRef, watch } from 'vue'
import { useHead, useRoute } from '#imports'
import { useDataStore } from '~/stores/data'
import { useScreen } from '~/composables/useScreen'
import { useRecordFrom } from '~/composables/useRightPage'
import { useTitleCollapse } from '~/composables/useTitleCollapse'
import { nb } from '~/domain/text'
import AppScreen from '~/components/shell/AppScreen.vue'
import BackLink from '~/components/shell/BackLink.vue'
import RecordView from '~/components/record/RecordView.vue'
import RecordMenu from '~/components/record/RecordMenu.vue'
import EditingBar from '~/components/body/EditingBar.vue'
import { useBodyEditing } from '~/composables/useBodyEditing'

const route = useRoute()
const data = useDataStore()
const { isDesktop } = useScreen()
const recordFrom = useRecordFrom()
const rec = computed(() => data.records[route.params.id as string])
const page = computed(() => rec.value ? data.pages[rec.value.pageId] : undefined)
const parent = computed(() => rec.value?.parentId ? data.records[rec.value.parentId] : undefined)
const live = computed(() => rec.value && !rec.value.deletedAt && page.value && !page.value.deletedAt)
/** A computer goes back to the page the record was opened from (Сегодня, a page that collects), else to its own */
const from = computed(() => isDesktop.value ? recordFrom(rec.value) : page.value)
const back = computed(() => parent.value ? { to: `/r/${parent.value.id}`, label: parent.value.text } : { to: `/p/${from.value?.id}`, label: from.value?.title || 'Без названия' })
const body = useBodyEditing()
const editing = computed(() => body.on('main'))
/**
 * The editing bar: on a phone while the text has focus; on a computer only for what the keys alone cannot do, a selection
 * (the ring), «@» and a link's address, never the caret's tools or «Готово» (computer delta, item 17)
 */
const barUp = computed(() => editing.value && (!isDesktop.value || body.face.value !== 'caret'))
const screen = useTemplateRef<InstanceType<typeof AppScreen>>('screen')
// Once the title is under the header the header names the record, as pages do (v23, B2, M6)
const { collapsed } = useTitleCollapse(computed(() => screen.value?.scroller), '[data-title-block]', 'bottom', () => route.params.id)
// «Связано» stays in the record: a computer has no third panel (computer delta, item 16)
const aside = false

useHead({ title: computed(() => `${rec.value?.text ?? 'Запись'} · Cerulean`) })

// Another tab changed this record: the page keeps what is on screen until «Обновить»
let held: string | null = null
watch(() => rec.value?.id, (id) => {
  if (held) data.release(held)
  held = id ?? null
  if (held) data.hold(held)
}, { immediate: true })
onUnmounted(() => held && data.release(held))
const changedElsewhere = computed(() => !!rec.value && !!data.waiting[rec.value.id])
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <AppScreen
      v-if="live && rec"
      ref="screen"
    >
      <template #header>
        <header class="relative box-content flex h-11 shrink-0 items-center pt-[env(safe-area-inset-top)] pr-1.5 pl-1 lg:hidden">
          <BackLink
            v-slot="{ label }"
            :to="back.to"
            :label="back.label"
            class="flex h-11 min-w-0 items-center gap-0.5 rounded-card pr-2.5 pl-1 text-base text-accent-ink active:bg-pressed"
            :class="collapsed ? 'max-w-[118px]' : 'max-w-60'"
          >
            <UIcon
              name="i-lucide-chevron-left"
              class="size-6 shrink-0"
            /><span class="truncate">{{ label }}</span>
          </BackLink>
          <span class="flex-1" />
          <span
            class="pointer-events-none absolute left-1/2 max-w-40 -translate-x-1/2 truncate text-base font-semibold text-highlighted"
            :class="{ invisible: !collapsed }"
            aria-hidden="true"
          >{{ nb(rec.text) }}</span>
          <RecordMenu :rec="rec" />
        </header>
        <!-- Computer: «‹ <page>» at the column's top-left, «⋯» in the window's top-right corner; past the title the header
             names the record -->
        <header
          class="relative hidden h-17 shrink-0 lg:block lg:px-8"
          :data-slim="collapsed || undefined"
        >
          <div class="mx-auto flex h-full w-full max-w-188 items-start pt-3">
            <BackLink
              v-slot="{ label }"
              :to="back.to"
              :label="back.label"
              class="flex h-11 min-w-0 max-w-60 items-center gap-0.5 rounded-card pr-2.5 pl-1 text-base text-accent-ink hover:bg-hover active:bg-pressed"
              data-record-back
            >
              <UIcon
                name="i-lucide-chevron-left"
                class="size-5.5 shrink-0"
              /><span class="truncate">{{ label }}</span>
            </BackLink>
          </div>
          <span
            v-if="collapsed"
            class="pointer-events-none absolute top-3 left-1/2 flex h-11 max-w-90 -translate-x-1/2 items-center text-base font-semibold text-highlighted"
            aria-hidden="true"
          ><span class="truncate">{{ nb(rec.text) }}</span></span>
          <span
            class="absolute top-3 right-3 flex size-11 items-center justify-center"
            data-page-dots
          >
            <RecordMenu :rec="rec" />
          </span>
        </header>
      </template>

      <div class="mx-auto w-full lg:max-w-204 lg:px-8">
        <RecordView
          :rec="rec"
          :aside="aside"
        >
          <template #status>
            <div
              v-if="changedElsewhere"
              role="status"
              class="mt-1 mb-2 flex items-center gap-2 rounded-chip bg-card pr-1 pl-3 text-sm text-default lg:mt-3 lg:mb-0"
            >
              <span class="min-w-0 flex-1">Запись изменили в другой вкладке</span>
              <UButton
                color="primary"
                variant="ghost"
                size="lg"
                class="px-2.5 font-normal"
                @click="data.takeWaiting(rec.id)"
              >
                Обновить
              </UButton>
            </div>
          </template>
        </RecordView>
      </div>

      <template
        v-if="!isDesktop || barUp"
        #dock
      >
        <EditingBar v-if="barUp" />
      </template>
    </AppScreen>
    <div
      v-else
      class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
    >
      <p class="text-base text-highlighted">
        Запись удалена или её нет
      </p>
      <UButton to="/">
        На главную
      </UButton>
    </div>
  </div>
</template>
