<script setup lang="ts">
// Desktop, right of a page: what came here from Чат lately and the Описание для Авто
import { computed, ref } from 'vue'
import type { Page } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { formatMoment } from '~/domain/dates'
import { count, RECORD_FORMS } from '~/domain/text'

const props = defineProps<{ page: Page }>()
const data = useDataStore()
const now = useNow()
const fromChat = computed(() => data.entries.filter(e => e.pageId === props.page.id && e.kind === 'routed').slice(-4).reverse())
const editing = ref(false)
const draft = ref('')
function edit() {
  draft.value = props.page.description
  editing.value = true
}
function save() {
  data.updatePage(props.page.id, { description: draft.value.trim() })
  editing.value = false
}
</script>

<template>
  <aside
    class="hidden w-75 shrink-0 overflow-y-auto border-l border-default px-3 py-4.5 xl:block"
    aria-label="О странице"
  >
    <template v-if="fromChat.length">
      <h2 class="px-2.5 pt-4 pb-1.5 text-cap text-toned first:pt-0">
        Из чата
      </h2>
      <ul class="flex flex-col gap-3 px-2.5">
        <li
          v-for="e in fromChat"
          :key="e.id"
        >
          <p class="text-15 text-highlighted">
            «{{ e.text }}»
          </p>
          <p class="text-13 text-toned">
            {{ formatMoment(e.at, now) }} · {{ count(e.recordIds?.length ?? 0, RECORD_FORMS) }}
          </p>
        </li>
      </ul>
    </template>
    <template v-if="page.kind === 'page'">
      <h2 class="px-2.5 pt-5 pb-1.5 text-cap text-toned">
        Описание для Авто
      </h2>
      <form
        v-if="editing"
        class="flex flex-col gap-2 px-1"
        @submit.prevent="save"
      >
        <UTextarea
          v-model="draft"
          :rows="3"
          autoresize
          autofocus
          aria-label="Описание для Авто"
        />
        <div class="flex justify-end gap-2">
          <UButton
            size="sm"
            @click="editing = false"
          >
            Отмена
          </UButton>
          <UButton
            size="sm"
            type="submit"
            color="primary"
            variant="solid"
          >
            Сохранить
          </UButton>
        </div>
      </form>
      <template v-else>
        <div class="mx-1 rounded-card border border-default bg-default px-3 py-2.5">
          <p
            v-if="page.description"
            class="text-15 text-highlighted first-letter:uppercase"
          >
            {{ page.description }}
          </p>
          <p
            v-else
            class="text-15 text-toned"
          >
            Не задано: Авто решает только по названию
          </p>
        </div>
        <UButton
          variant="link"
          color="primary"
          class="mt-1.5 ml-2.5"
          @click="edit"
        >
          Изменить
        </UButton>
      </template>
    </template>
  </aside>
</template>
