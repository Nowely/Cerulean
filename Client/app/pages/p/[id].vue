<script setup lang="ts">
// A page opened from navigation: full, with its composer
import { computed, ref, useTemplateRef } from 'vue'
import { useHead, useRoute } from '#imports'
import { useDataStore } from '~/stores/data'
import { useScreen } from '~/composables/useScreen'
import { usePeek } from '~/composables/usePeek'
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

useHead({ title: computed(() => `${page.value?.title || 'Без названия'} · Cerulean`) })
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <AppScreen v-if="live && page">
      <template #header>
        <header class="flex h-11 shrink-0 items-center pt-[env(safe-area-inset-top)] pr-1.5 pl-1 lg:hidden">
          <BackLink
            v-slot="{ label }"
            to="/"
            label="Главная"
            class="flex h-11 items-center gap-0.5 rounded-card pr-2.5 pl-1 text-base text-accent-ink active:bg-pressed"
          >
            <UIcon
              name="i-lucide-chevron-left"
              class="size-6"
            />{{ label }}
          </BackLink>
          <span class="flex-1" />
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
    <PageAside
      v-if="isDesktop && live && page && !peek.target.value && !view?.wide"
      :page="page"
    />
  </div>
</template>
