<script setup lang="ts">
// A page opened from navigation: full, with its field (main flow, item 12). A page with no records and no kind has
// «Начать с» in the field's place while nothing is written (item 16); the editing bar takes the slot while its text has
// the caret, and the «+ Новая запись» line takes it while that line is open.
// On a computer the page is on the right beside Главная (computer delta, items 4, 5, 17, 18): no way back, only «⋯» at
// the window's top-right; no field of its own (Главная's is the one), the bar only for a selection, «@» or an address,
// and «Начать с» sits under the title
import { computed, ref, useTemplateRef } from 'vue'
import { useHead, useRoute } from '#imports'
import { useDataStore } from '~/stores/data'
import { useScreen } from '~/composables/useScreen'
import { useTitleCollapse } from '~/composables/useTitleCollapse'
import AppScreen from '~/components/shell/AppScreen.vue'
import BackLink from '~/components/shell/BackLink.vue'
import PageView from '~/components/page/PageView.vue'
import PageMenu from '~/components/page/PageMenu.vue'
import PageTile from '~/components/common/PageTile.vue'
import FlowField from '~/components/composer/FlowField.vue'
import PageStarters from '~/components/page/PageStarters.vue'
import EditingBar from '~/components/body/EditingBar.vue'
import { useBodyEditing } from '~/composables/useBodyEditing'

const route = useRoute()
const data = useDataStore()
const { isDesktop } = useScreen()
const page = computed(() => data.pages[route.params.id as string])
const live = computed(() => page.value && !page.value.deletedAt)
/** The title of a page with no kind, or the «+ Новая запись» line, has the caret: the field steps aside */
const editing = ref(false)
/** The page note has focus: the editing bar takes the composer's slot (v23) */
const body = useBodyEditing()
const noting = computed(() => body.on('main'))
/** On a computer the bar comes only for a selection, «@» and a link's address (computer delta, item 17) */
const barUp = computed(() => noting.value && (!isDesktop.value || body.face.value !== 'caret'))
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
        <header class="relative box-content flex h-11 shrink-0 items-center pt-[env(safe-area-inset-top)] pr-1.5 pl-1 lg:hidden">
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
        <!-- Computer: Главная is beside it, so no way back; «⋯» in the window's top-right corner (Notion, Mail). Past the
             title block the header names the page and its tab -->
        <header
          class="relative hidden h-17 shrink-0 lg:block"
          :data-slim="collapsed || undefined"
        >
          <span
            v-if="collapsed"
            class="pointer-events-none absolute top-3 left-1/2 flex h-11 max-w-90 -translate-x-1/2 items-center text-base font-semibold text-highlighted"
            aria-hidden="true"
          ><span class="truncate">{{ view?.heading }}</span></span>
          <span
            class="absolute top-3 right-3 flex size-11 items-center justify-center"
            data-page-dots
          >
            <PageMenu
              :page="page"
              @settings="view?.openSettings()"
            />
          </span>
        </header>
      </template>

      <div
        class="mx-auto w-full lg:px-8"
        :class="view?.wide ? 'lg:max-w-none' : 'lg:max-w-204'"
      >
        <PageView
          ref="view"
          :page="page"
          @editing="v => editing = v"
        />
      </div>

      <template
        v-if="!isDesktop || barUp"
        #dock
      >
        <template v-if="!isDesktop">
          <PageStarters
            v-if="view?.undecided && !noting"
            :page="page"
            @picked="view?.startAdd()"
          />
          <FlowField
            v-else
            v-show="!editing && !noting"
            :key="page.id"
            :mode="page.kind === 'today' ? 'today' : 'page'"
            :page-id="page.kind === 'today' ? undefined : page.id"
          />
        </template>
        <EditingBar v-if="barUp" />
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
  </div>
</template>
