<script setup lang="ts">
// Чат: the journal of everything written, newest at the bottom. Not a companion: no replies, only receipts.
import { computed, nextTick, onMounted, useTemplateRef, watch } from 'vue'
import { useHead } from '#imports'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { dayKey, formatDay } from '~/domain/dates'
import AppScreen from '~/components/shell/AppScreen.vue'
import MobileHeader from '~/components/shell/MobileHeader.vue'
import DeskHeader from '~/components/shell/DeskHeader.vue'
import JournalEntry from '~/components/chat/JournalEntry.vue'
import AppComposer from '~/components/composer/AppComposer.vue'
import ChipButton from '~/components/common/ChipButton.vue'

useHead({ title: 'Чат · Cerulean' })

const data = useDataStore()
const now = useNow()
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
  <AppScreen ref="screen">
    <template #header>
      <MobileHeader />
      <DeskHeader title="Чат" />
    </template>

    <div class="mx-auto flex min-h-full w-full flex-col justify-end px-4 pt-1 pb-3 lg:max-w-170 lg:px-8">
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
          Пиши как в заметках. Записи разложатся по страницам, а здесь останется квитанция: что создано и где. Если место неясно, запись подождёт во Входящих с меткой «уточнить».
        </p>
        <div class="flex flex-wrap gap-1.5">
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
        <h2 class="sticky top-0 z-1 flex items-center gap-3 bg-canvas pt-2.5 pb-0.5 text-caption text-toned lg:text-dimmed">
          {{ d.label }}<span class="hidden h-px flex-1 bg-line lg:block" />
        </h2>
        <JournalEntry
          v-for="e in d.entries"
          :key="e.id"
          :entry="e"
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
