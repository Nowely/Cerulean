<script setup lang="ts">
// A template's own page (v24, И9, И7), from a «Шаблоны» row: back to its page, the template edited in place, and the
// record composer («Подпункт ⌄», «В заметку») that writes into the template. While its body has focus the editing bar
// takes the composer's slot, as on a record
import { computed, useTemplateRef } from 'vue'
import { useHead, useRoute } from '#imports'
import { useDataStore } from '~/stores/data'
import { useTitleCollapse } from '~/composables/useTitleCollapse'
import { useBodyEditing } from '~/composables/useBodyEditing'
import { nb } from '~/domain/text'
import AppScreen from '~/components/shell/AppScreen.vue'
import DeskBack from '~/components/shell/DeskBack.vue'
import BackLink from '~/components/shell/BackLink.vue'
import TemplateView from '~/components/record/TemplateView.vue'
import TemplateMenu from '~/components/record/TemplateMenu.vue'
import AppComposer from '~/components/composer/AppComposer.vue'
import EditingBar from '~/components/body/EditingBar.vue'

const route = useRoute()
const data = useDataStore()
const found = computed(() => data.templateOf(route.params.id as string))
const back = computed(() => ({ to: `/p/${found.value?.page.id}`, label: found.value?.page.title || 'Без названия' }))
const body = useBodyEditing()
const editing = computed(() => body.on('main'))
const screen = useTemplateRef<InstanceType<typeof AppScreen>>('screen')
const { collapsed } = useTitleCollapse(computed(() => screen.value?.scroller), '[data-title-block]', 'bottom', () => route.params.id)

useHead({ title: computed(() => `${found.value?.tpl.name ?? 'Шаблон'} · Cerulean`) })
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <AppScreen
      v-if="found"
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
          >{{ nb(found.tpl.name) }}</span>
          <TemplateMenu
            :tpl="found.tpl"
            :page="found.page"
          />
        </header>
        <!-- Desktop: the slim header past the title, the way back, the template's name and «⋯» -->
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
            >{{ nb(found.tpl.name) }}</span>
            <span class="flex-1" />
            <TemplateMenu
              :tpl="found.tpl"
              :page="found.page"
            />
          </div>
        </header>
      </template>

      <div class="mx-auto w-full lg:max-w-186 lg:px-8">
        <DeskBack
          :crumbs="[back]"
          inside
        />
        <TemplateView
          :tpl="found.tpl"
          :page="found.page"
        >
          <template #menu>
            <TemplateMenu
              :tpl="found.tpl"
              :page="found.page"
            />
          </template>
        </TemplateView>
      </div>

      <template #dock>
        <AppComposer
          v-show="!editing"
          mode="record"
          :template-id="found.tpl.id"
        />
        <EditingBar v-if="editing" />
      </template>
    </AppScreen>
    <div
      v-else
      class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
    >
      <p class="text-base text-highlighted">
        Шаблон удалён или его нет
      </p>
      <UButton to="/">
        На главную
      </UButton>
    </div>
  </div>
</template>
