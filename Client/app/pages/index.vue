<script setup lang="ts">
// Главная: Избранное, Входящие, the sections with their pages. Write at the bottom; the receipt shows above the composer.
import { computed, ref } from 'vue'
import { useHead } from '#imports'
import type { Entry, Id } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { useScreen } from '~/composables/useScreen'
import { useCreatePage } from '~/composables/useCreatePage'
import AppScreen from '~/components/shell/AppScreen.vue'
import MobileHeader from '~/components/shell/MobileHeader.vue'
import DeskHeader from '~/components/shell/DeskHeader.vue'
import HomeRow from '~/components/home/HomeRow.vue'
import FavCard from '~/components/home/FavCard.vue'
import SectionHeader from '~/components/home/SectionHeader.vue'
import KeyCard from '~/components/home/KeyCard.vue'
import StartCard from '~/components/home/StartCard.vue'
import AppComposer from '~/components/composer/AppComposer.vue'
import EntryCard from '~/components/chat/EntryCard.vue'

useHead({ title: 'Главная · Cerulean' })

const data = useDataStore()
const journal = useJournalStore()
const { isDesktop } = useScreen()
const { create } = useCreatePage()

const compact = computed(() => data.settings.homeRows === 'compact')
const userPages = computed(() => data.livePages.filter(p => p.kind === 'page'))
const loose = computed(() => data.livePages.filter(p => (p.kind === 'page' || p.kind === 'today') && !p.sectionId && p.favorite === null))
const pagesOf = (sectionId: Id) => data.livePages.filter(p => p.sectionId === sectionId)
const showKey = computed(() => !data.settings.apiKey && !data.settings.dismissed.includes('key-card'))
const showStart = computed(() => !userPages.value.length && !data.settings.dismissed.includes('start-card'))
const newSection = ref<Id | null>(null)

function addSection() {
  newSection.value = data.createSection('Новая секция').id
}

// The last line written here: its card floats above the composer until it settles
const sentId = ref<Id | null>(null)
const sent = computed<Entry | undefined>(() => data.entries.find(e => e.id === sentId.value))
const showSent = computed(() => {
  const e = sent.value
  if (!e) return false
  if (e.kind === 'routed' || e.kind === 'undone') return journal.fresh.has(e.id)
  return true
})
</script>

<template>
  <AppScreen wide>
    <template #header>
      <MobileHeader />
      <DeskHeader title="Главная" />
    </template>

    <div class="mx-auto w-full px-2 pt-1 pb-4 lg:max-w-180 lg:px-8 lg:pt-6">
      <!-- Избранное: cards on a phone, rows on desktop -->
      <section
        v-if="data.favorites.length"
        aria-labelledby="fav-title"
      >
        <h2
          id="fav-title"
          class="px-3 pt-3 pb-1.5 text-caption text-toned lg:px-2.5 lg:pt-0 lg:text-dimmed"
        >
          Избранное
        </h2>
        <div
          v-if="!isDesktop"
          class="grid grid-cols-2 gap-2 px-1"
        >
          <template
            v-for="f in data.favorites"
            :key="f.kind + (f.kind === 'page' ? f.page.id : f.rec.id)"
          >
            <FavCard
              v-if="f.kind === 'page'"
              :page="f.page"
            />
            <FavCard
              v-else
              :rec="f.rec"
            />
          </template>
        </div>
        <template v-else>
          <template
            v-for="f in data.favorites"
            :key="f.kind + (f.kind === 'page' ? f.page.id : f.rec.id)"
          >
            <HomeRow
              v-if="f.kind === 'page'"
              :page="f.page"
              :compact="compact"
            />
            <HomeRow
              v-else
              :rec="f.rec"
              :compact="compact"
            />
          </template>
        </template>
      </section>

      <div
        v-if="showKey || showStart"
        class="mt-2 flex flex-col gap-2 px-1 lg:px-0"
      >
        <KeyCard v-if="showKey" />
        <StartCard v-if="showStart" />
      </div>

      <div class="mt-2">
        <HomeRow
          :page="data.inbox"
          :compact="compact"
        />
        <HomeRow
          v-for="p in loose"
          :key="p.id"
          :page="p"
          :compact="compact"
        />
      </div>

      <section
        v-for="s in data.sectionList"
        :key="s.id"
        :aria-label="s.name"
      >
        <SectionHeader
          :section="s"
          :editing="newSection === s.id"
          @done="newSection = null"
        />
        <template v-if="!s.collapsed">
          <HomeRow
            v-for="p in pagesOf(s.id)"
            :key="p.id"
            :page="p"
            :compact="compact"
          />
          <p
            v-if="!pagesOf(s.id).length"
            class="px-3 py-2 text-meta text-toned"
          >
            Пока пусто. <button
              type="button"
              class="cursor-pointer text-accent-ink hover:underline"
              @click="create({ sectionId: s.id })"
            >
              Новая страница
            </button>
          </p>
        </template>
      </section>

      <div class="mt-3 flex flex-wrap gap-x-1 px-1 lg:px-0">
        <button
          type="button"
          class="flex h-11 cursor-pointer items-center gap-2.5 rounded-chip pr-3 pl-2.5 text-15 text-toned hover:bg-muted hover:text-highlighted active:bg-pressed lg:h-9 lg:text-sm"
          @click="create()"
        >
          <UIcon
            name="i-lucide-plus"
            class="size-4.5"
          />Новая страница
        </button>
        <button
          type="button"
          class="flex h-11 cursor-pointer items-center gap-2.5 rounded-chip pr-3 pl-2.5 text-15 text-toned hover:bg-muted hover:text-highlighted active:bg-pressed lg:h-9 lg:text-sm"
          @click="addSection"
        >
          <UIcon
            name="i-lucide-folder-plus"
            class="size-4.5"
          />Новая секция
        </button>
      </div>
    </div>

    <template #dock>
      <div
        v-if="showSent && sent"
        class="relative"
      >
        <EntryCard
          :entry="sent"
          float
        />
        <UButton
          v-if="sent.kind !== 'routed' && sent.kind !== 'pending'"
          icon="i-lucide-x"
          variant="ghost"
          square
          size="sm"
          aria-label="Скрыть"
          class="absolute top-1 right-1"
          @click="sentId = null"
        />
      </div>
      <AppComposer
        mode="auto"
        float
        @sent="e => sentId = e?.id ?? null"
      />
    </template>
  </AppScreen>
</template>
