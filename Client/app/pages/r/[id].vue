<script setup lang="ts">
// A record opened from navigation: full, with the composer for Подпункты
import { computed, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { useHead, useRoute } from '#imports'
import { useDataStore } from '~/stores/data'
import { useScreen } from '~/composables/useScreen'
import { usePeek } from '~/composables/usePeek'
import { useTitleCollapse } from '~/composables/useTitleCollapse'
import { nb } from '~/domain/text'
import AppScreen from '~/components/shell/AppScreen.vue'
import DeskBack from '~/components/shell/DeskBack.vue'
import BackLink from '~/components/shell/BackLink.vue'
import RecordView from '~/components/record/RecordView.vue'
import RecordLinks from '~/components/record/RecordLinks.vue'
import RecordMenu from '~/components/record/RecordMenu.vue'
import AppComposer from '~/components/composer/AppComposer.vue'

const route = useRoute()
const data = useDataStore()
const { isDesktop } = useScreen()
const peek = usePeek()
const rec = computed(() => data.records[route.params.id as string])
const page = computed(() => rec.value ? data.pages[rec.value.pageId] : undefined)
const parent = computed(() => rec.value?.parentId ? data.records[rec.value.parentId] : undefined)
const live = computed(() => rec.value && !rec.value.deletedAt && page.value && !page.value.deletedAt)
const back = computed(() => parent.value ? { to: `/r/${parent.value.id}`, label: parent.value.text } : { to: `/p/${page.value?.id}`, label: page.value?.title || 'Без названия' })
/** «‹ Цели /», «‹ Цели / Полумарафон к маю /» */
const crumbs = computed(() => [
  { to: `/p/${page.value?.id}`, label: page.value?.title || 'Без названия' },
  ...(parent.value ? [{ to: `/r/${parent.value.id}`, label: parent.value.text }] : [])
])
const editing = ref(false)
const screen = useTemplateRef<InstanceType<typeof AppScreen>>('screen')
// Once the title is under the header the header names the record, as pages do (v23, B2, M6)
const { collapsed } = useTitleCollapse(computed(() => screen.value?.scroller), '[data-title-block]', 'bottom', () => route.params.id)
// Wide desktop: «Связано» in a column on the right, unless a preview takes that place
const aside = computed(() => isDesktop.value && !peek.target.value)

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
        <header class="relative flex h-11 shrink-0 items-center pt-[env(safe-area-inset-top)] pr-1.5 pl-1 lg:hidden">
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
        <!-- Desktop: the slim header past the title, the way back, the record's name and «⋯» -->
        <header
          v-if="collapsed"
          class="hidden h-11 shrink-0 lg:block lg:px-8"
          data-slim
        >
          <div class="relative mx-auto flex h-full w-full max-w-170 items-center">
            <BackLink
              v-slot="{ label }"
              :to="back.to"
              :label="back.label"
              class="flex h-8 min-w-0 max-w-60 items-center gap-1 rounded-badge text-13 text-toned hover:text-highlighted"
            >
              <UIcon
                name="i-lucide-chevron-left"
                class="size-3.5 shrink-0"
              /><span class="truncate">{{ label }}</span>
            </BackLink>
            <span
              class="pointer-events-none absolute left-1/2 max-w-90 -translate-x-1/2 truncate text-base font-semibold text-highlighted"
              aria-hidden="true"
            >{{ nb(rec.text) }}</span>
            <span class="flex-1" />
            <RecordMenu :rec="rec" />
          </div>
        </header>
      </template>

      <div class="mx-auto w-full lg:max-w-186 lg:px-8">
        <DeskBack
          :crumbs="crumbs"
          inside
        />
        <RecordView
          :rec="rec"
          :aside="aside"
          @editing="v => editing = v"
        >
          <template #menu>
            <RecordMenu :rec="rec" />
          </template>
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

      <template #dock>
        <AppComposer
          v-show="!editing"
          mode="record"
          :record-id="rec.id"
        />
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
    <aside
      v-if="aside && live && rec && data.linksOf(rec.id).length"
      class="hidden w-75 shrink-0 overflow-y-auto border-l border-default px-3 py-4.5 xl:block"
      aria-label="Связано"
    >
      <h2 class="px-2.5 pb-1.5 text-cap text-toned">
        Связано
      </h2>
      <RecordLinks :rec="rec" />
    </aside>
  </div>
</template>
