<script setup lang="ts">
// «Что сюда класть»: the words that tell Авто what goes on this page, read like a short instruction (v23: never «описание»)
import { ref, watch } from 'vue'
import type { Page } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'

const props = defineProps<{ page: Page }>()
const open = defineModel<boolean>('open', { default: false })
const data = useDataStore()
const draft = ref('')

watch(open, (v) => {
  if (v) draft.value = props.page.description
}, { immediate: true })

function save() {
  data.updatePage(props.page.id, { description: draft.value.trim() })
  open.value = false
}
</script>

<template>
  <AdaptiveOverlay
    v-model:open="open"
    :title="`Что сюда класть: ${page.title || 'Без названия'}`"
    dialog
  >
    <form
      class="flex flex-col gap-2 px-2 pt-1 pb-2"
      @submit.prevent="save"
    >
      <UTextarea
        v-model="draft"
        :rows="3"
        autoresize
        autofocus
        placeholder="Например: еда, напитки, бытовая химия"
        aria-label="Что сюда класть"
      />
      <p class="text-13 leading-snug text-toned">
        По этим словам решается, куда положить запись. Пиши, что сюда класть, можно с примерами.
      </p>
      <div class="flex justify-end gap-2">
        <UButton
          size="lg"
          class="lg:h-9 lg:text-sm"
          @click="open = false"
        >
          Отмена
        </UButton>
        <UButton
          type="submit"
          color="primary"
          variant="solid"
          size="lg"
          class="lg:h-9 lg:text-sm"
        >
          Сохранить
        </UButton>
      </div>
    </form>
  </AdaptiveOverlay>
</template>
