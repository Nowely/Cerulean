<script setup lang="ts">
// «Загрузить копию»: both counts up front. Adding to what is here is the default and can be taken back;
// replacing everything asks once more, with both numbers, and saves a copy of what is here first.
import { computed, ref, watch } from 'vue'
import { useRouter } from '#imports'
import { useDataStore } from '~/stores/data'
import { useScreen } from '~/composables/useScreen'
import { useNotify } from '~/composables/useNotify'
import { useCopy } from '~/composables/useCopy'
import { addedText, measure, sizeText, type Snapshot } from '~/domain/export'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'

const props = defineProps<{ file: { name: string, snap: Snapshot } | null }>()
const open = defineModel<boolean>('open', { default: false })
const data = useDataStore()
const router = useRouter()
const notify = useNotify()
const { saveCopy } = useCopy()
const { isDesktop } = useScreen()

const step = ref<'choose' | 'confirm'>('choose')
watch(open, (v) => {
  if (v) step.value = 'choose'
})

const here = computed(() => sizeText(measure({ pages: Object.values(data.pages), records: Object.values(data.records) })))
const there = computed(() => props.file ? sizeText(measure(props.file.snap)) : '')
const size = computed(() => isDesktop.value ? 'lg' : 'xl')

function add() {
  if (!props.file) return
  const added = data.addSnapshot(props.file.snap)
  open.value = false
  const n = { pages: added.pages.length, records: added.records.length }
  if (n.pages || n.records) notify(addedText(n), { label: 'Отменить', run: () => data.takeBack(added) }, 8000)
  else notify('Всё из файла уже есть здесь', undefined, 4000)
}

async function replace() {
  if (!props.file) return
  saveCopy('json')
  await data.importSnapshot(props.file.snap)
  open.value = false
  void router.push('/')
  notify(`Загружено ${there.value}`, undefined, 4000)
}
</script>

<template>
  <AdaptiveOverlay
    v-model:open="open"
    :title="step === 'confirm' ? 'Заменить всё?' : 'Загрузить копию'"
    dialog
  >
    <div class="flex flex-col gap-2 px-3 pt-1 lg:px-2">
      <p class="pb-2 text-15 leading-normal text-toned lg:text-sm">
        <template v-if="step === 'choose'">
          В файле {{ file?.name }} {{ there }}. Здесь сейчас {{ here }}.
        </template>
        <template v-else>
          Здесь удалятся {{ here }}, вместо них будут данные из файла. Перед этим сохранится копия того, что есть сейчас.
        </template>
      </p>
      <template v-if="step === 'choose'">
        <UButton
          color="primary"
          variant="solid"
          :size="size"
          block
          @click="add"
        >
          Добавить к текущим
        </UButton>
        <p class="mx-1 -mt-0.5 mb-2 text-center text-13 text-toned">
          Страницы с тем же названием объединятся, одинаковые записи не задвоятся
        </p>
        <UButton
          color="error"
          variant="outline"
          :size="size"
          block
          @click="step = 'confirm'"
        >
          Заменить всё
        </UButton>
      </template>
      <UButton
        v-else
        color="error"
        variant="solid"
        :size="size"
        block
        @click="replace"
      >
        Заменить
      </UButton>
      <UButton
        :size="size"
        block
        @click="open = false"
      >
        Отмена
      </UButton>
    </div>
  </AdaptiveOverlay>
</template>
