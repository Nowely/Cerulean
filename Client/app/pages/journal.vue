<script setup lang="ts">
// Журнал: the journal of everything written, newest at the bottom. Not a companion: no replies, only receipts.
import { computed, nextTick, onMounted, useTemplateRef, watch } from 'vue'
import { useHead } from '#imports'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { useFind } from '~/composables/useFind'
import { dayKey, formatDay } from '~/domain/dates'
import AppScreen from '~/components/shell/AppScreen.vue'
import BackHeader from '~/components/shell/BackHeader.vue'
import TitleHeader from '~/components/shell/TitleHeader.vue'
import JournalEntry from '~/components/chat/JournalEntry.vue'
import AppComposer from '~/components/composer/AppComposer.vue'
import ChipButton from '~/components/common/ChipButton.vue'

useHead({ title: 'Журнал · Cerulean' })

const data = useDataStore()
const now = useNow()
const find = useFind()
const screen = useTemplateRef<InstanceType<typeof AppScreen>>('screen')
const composer = useTemplateRef<InstanceType<typeof AppComposer>>('composer')

const days = computed(() => {
  const out: { key: string, label: string, entries: typeof data.entries }[] = []
  for (const e of data.entries) {
    const key = dayKey(e.at)
    let day = out[out.length - 1]
    if (!day || day.key !== key) {
      day = { key, label: formatDay(e.at, now.value), entries: [] }
      out.push(day)
    }
    day.entries.push(e)
  }
  return out
})
/** Days before today: their receipts are one line (v23, B5) */
const today = computed(() => dayKey(now.value))

const EXAMPLES = ['хлеб и молоко', 'позвонить маме в 7', 'идея: подарить маме книгу']

async function toBottom() {
  await nextTick()
  const el = screen.value?.scroller
  if (el) el.scrollTop = el.scrollHeight
}
onMounted(toBottom)
watch(() => data.entries.length, toBottom)
</script>

<template>
  <AppScreen
    ref="screen"
    chat
  >
    <template #header>
      <BackHeader
        to="/"
        label="Главная"
        title="Журнал"
      >
        <UButton
          icon="i-lucide-search"
          variant="ghost"
          square
          size="lg"
          aria-label="Найти"
          class="text-toned"
          @click="find.open()"
        />
      </BackHeader>
      <TitleHeader
        title="Журнал"
        width="chat"
      >
        <UTooltip text="Найти · Ctrl K">
          <UButton
            icon="i-lucide-search"
            variant="ghost"
            square
            aria-label="Найти"
            class="text-toned"
            @click="find.open()"
          />
        </UTooltip>
      </TitleHeader>
    </template>

    <div class="mx-auto flex min-h-full w-full flex-col px-4 pt-1 pb-3 lg:max-w-160 lg:px-0">
      <h1 class="px-1 pb-1 text-title text-highlighted lg:hidden">
        Журнал
      </h1>
      <span class="flex-1" />
      <section
        v-if="!days.length"
        class="flex flex-col gap-2.5 px-1 pt-3 pb-2"
        aria-labelledby="chat-empty"
      >
        <h2
          id="chat-empty"
          class="text-17 font-semibold text-highlighted"
        >
          Здесь журнал всего, что записано
        </h2>
        <p class="text-sm leading-normal text-toned">
          Пиши как в заметках. Записи разложатся по страницам, а здесь останется, что создано и где. Если место неясно, запись подождёт во Входящих с меткой «уточнить».
        </p>
        <!-- Examples sit sunk into the page, as chips on a page background do -->
        <div class="sunk flex flex-wrap gap-1.5">
          <ChipButton
            v-for="x in EXAMPLES"
            :key="x"
            :label="x"
            @click="composer?.setText(x)"
          />
        </div>
      </section>
      <section
        v-for="d in days"
        :key="d.key"
        :aria-label="d.label"
      >
        <!-- The day scrolls with its entries: stuck to the top it cut the card under it in half (canvas 62, `.day`) -->
        <h2 class="pt-4 pb-1 text-cap text-toned">
          {{ d.label }}
        </h2>
        <JournalEntry
          v-for="e in d.entries"
          :key="e.id"
          :entry="e"
          :past="d.key < today"
        />
      </section>
    </div>

    <template #dock>
      <AppComposer
        ref="composer"
        mode="auto"
      />
    </template>
  </AppScreen>
</template>
