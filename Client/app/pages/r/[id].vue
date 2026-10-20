<script setup lang="ts">
// A record opened from navigation: full, with the composer for Подпункты
import { computed, ref } from 'vue'
import { useHead, useRoute } from '#imports'
import { useDataStore } from '~/stores/data'
import { useScreen } from '~/composables/useScreen'
import { usePeek } from '~/composables/usePeek'
import AppScreen from '~/components/shell/AppScreen.vue'
import DeskHeader from '~/components/shell/DeskHeader.vue'
import RecordView from '~/components/record/RecordView.vue'
import RecordLinks from '~/components/record/RecordLinks.vue'
import RecordMenu from '~/components/record/RecordMenu.vue'
import PageTile from '~/components/common/PageTile.vue'
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
const editing = ref(false)
// Wide desktop: «Связано» in a column on the right, unless a preview takes that place
const aside = computed(() => isDesktop.value && !peek.target.value)

useHead({ title: computed(() => `${rec.value?.text ?? 'Запись'} · Cerulean`) })
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <AppScreen v-if="live && rec">
      <template #header>
        <header class="flex h-13 shrink-0 items-center pt-[env(safe-area-inset-top)] pr-1.5 pl-1 lg:hidden">
          <NuxtLink
            :to="back.to"
            class="flex h-11 min-w-0 max-w-60 items-center gap-0.5 rounded-card pr-2.5 pl-1 text-base text-accent-ink active:bg-pressed"
          >
            <UIcon
              name="i-lucide-chevron-left"
              class="size-6 shrink-0"
            /><span class="truncate">{{ back.label }}</span>
          </NuxtLink>
          <span class="flex-1" />
          <RecordMenu :rec="rec" />
        </header>
        <DeskHeader>
          <NuxtLink
            :to="back.to"
            class="flex size-8 items-center justify-center rounded-item text-toned hover:bg-muted hover:text-highlighted"
            aria-label="Назад"
          >
            <UIcon
              name="i-lucide-chevron-left"
              class="size-4.5"
            />
          </NuxtLink>
          <nav
            aria-label="Путь"
            class="flex min-w-0 items-center gap-1.5"
          >
            <NuxtLink
              :to="`/p/${page!.id}`"
              class="flex items-center gap-1.5 hover:text-highlighted"
            >
              <PageTile
                :glyph="page!.glyph"
                :color="page!.color"
                :size="16"
              />{{ page!.title }}
            </NuxtLink>
            <template v-if="parent">
              <span class="text-dimmed">/</span>
              <NuxtLink
                :to="`/r/${parent.id}`"
                class="truncate hover:text-highlighted"
              >{{ parent.text }}</NuxtLink>
            </template>
            <span class="text-dimmed">/</span>
            <b class="truncate font-medium text-highlighted">{{ rec.text }}</b>
          </nav>
          <template #actions>
            <RecordMenu :rec="rec" />
          </template>
        </DeskHeader>
      </template>

      <div class="mx-auto w-full lg:max-w-170 lg:px-8">
        <RecordView
          :rec="rec"
          :aside="aside"
          @editing="v => editing = v"
        />
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
