<script setup lang="ts">
// A page opened from navigation: full, with its composer
import { computed, ref, useTemplateRef } from 'vue'
import { useHead, useRoute } from '#imports'
import { useDataStore } from '~/stores/data'
import { useScreen } from '~/composables/useScreen'
import { usePeek } from '~/composables/usePeek'
import { useTitleCollapse } from '~/composables/useTitleCollapse'
import AppScreen from '~/components/shell/AppScreen.vue'
import DeskBack from '~/components/shell/DeskBack.vue'
import BackLink from '~/components/shell/BackLink.vue'
import PageView from '~/components/page/PageView.vue'
import PageMenu from '~/components/page/PageMenu.vue'
import PageAside from '~/components/page/PageAside.vue'
import PageTile from '~/components/common/PageTile.vue'
import ComposerDock from '~/components/composer/ComposerDock.vue'
import EditingBar from '~/components/body/EditingBar.vue'
import { useBodyEditing } from '~/composables/useBodyEditing'

const route = useRoute()
const data = useDataStore()
const { isDesktop } = useScreen()
const peek = usePeek()
const page = computed(() => data.pages[route.params.id as string])
const live = computed(() => page.value && !page.value.deletedAt)
/** A new page's setup has focus: its fields stand in for the composer */
const editing = ref(false)
/** The page note has focus: the editing bar takes the composer's slot (v23) */
const body = useBodyEditing()
const noting = computed(() => body.on('main'))
const view = useTemplateRef<InstanceType<typeof PageView>>('view')
const screen = useTemplateRef<InstanceType<typeof AppScreen>>('screen')
// Past the title block the header names the page and its tab (v23, B2); on desktop it is the slim 44px header
const { collapsed } = useTitleCollapse(computed(() => screen.value?.scroller), '[data-rows]', 'top', () => route.params.id)

useHead({ title: computed(() => `${page.value?.title || 'Без названия'} · Cerulean`) })
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <AppScreen
      v-if="live && page"
      ref="screen"
    >
      <template #header>
        <header class="relative flex h-11 shrink-0 items-center pt-[env(safe-area-inset-top)] pr-1.5 pl-1 lg:hidden">
          <BackLink
            v-slot="{ label }"
            to="/"
            label="Главная"
            class="flex h-11 min-w-0 items-center gap-0.5 rounded-card pr-2.5 pl-1 text-base text-accent-ink active:bg-pressed"
            :class="{ 'max-w-[118px]': collapsed }"
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
          >{{ view?.heading }}</span>
          <UButton
            v-if="page.kind === 'today'"
            icon="i-lucide-search"
            variant="ghost"
            square
            size="lg"
            aria-label="Найти на странице"
            class="text-toned"
            @click="view?.toggleSearch()"
          />
          <PageMenu
            :page="page"
            @settings="view?.openSettings()"
          />
        </header>
        <!-- Desktop: the slim header past the title block: «‹ Главная», the page and its tab, «⋯» -->
        <header
          v-if="collapsed"
          class="hidden h-11 shrink-0 lg:block lg:px-8"
          data-slim
        >
          <div
            class="relative mx-auto flex h-full w-full items-center"
            :class="{ 'max-w-170': !view?.wide }"
          >
            <BackLink
              v-slot="{ label }"
              to="/"
              label="Главная"
              class="flex h-8 min-w-0 items-center gap-1 rounded-badge text-13 text-toned hover:text-highlighted"
            >
              <UIcon
                name="i-lucide-chevron-left"
                class="size-3.5 shrink-0"
              /><span class="truncate">{{ label }}</span>
            </BackLink>
            <span
              class="pointer-events-none absolute left-1/2 max-w-90 -translate-x-1/2 truncate text-base font-semibold text-highlighted"
              aria-hidden="true"
            >{{ view?.heading }}</span>
            <span class="flex-1" />
            <PageMenu
              :page="page"
              @settings="view?.openSettings()"
            />
          </div>
        </header>
      </template>

      <div
        class="mx-auto w-full lg:px-8"
        :class="view?.wide ? 'lg:max-w-none' : 'lg:max-w-186'"
      >
        <DeskBack :crumbs="[{ to: '/', label: 'Главная' }]" />
        <PageView
          ref="view"
          :page="page"
          @editing="v => editing = v"
        >
          <template #menu>
            <PageMenu
              :page="page"
              @settings="view?.openSettings()"
            />
          </template>
        </PageView>
      </div>

      <template #dock>
        <ComposerDock
          v-show="!editing && !noting"
          :key="page.id"
          :mode="page.kind === 'today' ? 'today' : 'page'"
          :page-id="page.kind === 'today' ? undefined : page.id"
        />
        <EditingBar v-if="noting" />
      </template>
    </AppScreen>
    <div
      v-else
      class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
    >
      <PageTile
        glyph="doc"
        :size="36"
      />
      <p class="text-base text-highlighted">
        Страница удалена или её нет
      </p>
      <UButton to="/">
        На главную
      </UButton>
    </div>
    <!-- Входящие and Сегодня have nothing to put there (PagesInbox, PagesWeek); a new page asks «Что сюда класть?» itself (PagesEmpty) -->
    <PageAside
      v-if="isDesktop && live && page && page.kind === 'page' && !peek.target.value && !view?.wide && !view?.setup"
      :page="page"
    />
  </div>
</template>
