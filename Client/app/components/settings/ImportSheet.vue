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
const MERGE = 'Страницы с тем же названием объединятся, одинаковые записи не задвоятся'

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
    alert
  >
    <div class="flex flex-col gap-2 px-3 pt-1 lg:gap-0 lg:px-2">
      <p class="pb-2 text-15 leading-normal text-toned lg:pb-0 lg:text-default">
        <template v-if="step === 'choose'">
          В файле {{ file?.name }} {{ there }}. Здесь сейчас {{ here }}.
        </template>
        <template v-else>
          Здесь удалятся {{ here }}, вместо них будут данные из файла. Перед этим сохранится копия того, что есть сейчас.
        </template>
      </p>
      <!-- Desktop: one row, the weighty way on the left in words (Settings «Загрузить копию») -->
      <template v-if="isDesktop">
        <p
          v-if="step === 'choose'"
          class="pt-2 text-13 text-toned"
        >
          {{ MERGE }}
        </p>
        <div class="flex items-center gap-2 pt-4">
          <UButton
            v-if="step === 'choose'"
            color="error"
            variant="ghost"
            class="-ml-3 h-9 text-sm"
            @click="step = 'confirm'"
          >
            Заменить всё
          </UButton>
          <span class="flex-1" />
          <UButton
            class="h-9 text-sm"
            @click="open = false"
          >
            Отмена
          </UButton>
          <UButton
            v-if="step === 'choose'"
            color="primary"
            variant="solid"
            class="h-9 text-sm"
            @click="add"
          >
            Добавить к текущим
          </UButton>
          <UButton
            v-else
            color="error"
            variant="solid"
            class="h-9 text-sm"
            @click="replace"
          >
            Заменить
          </UButton>
        </div>
      </template>
      <template v-else>
        <template v-if="step === 'choose'">
          <UButton
            color="primary"
            variant="solid"
            size="xl"
            block
            @click="add"
          >
            Добавить к текущим
          </UButton>
          <p class="mx-1 -mt-0.5 mb-2 text-center text-13 text-toned">
            {{ MERGE }}
          </p>
          <UButton
            color="error"
            variant="outline"
            size="xl"
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
          size="xl"
          block
          @click="replace"
        >
          Заменить
        </UButton>
        <UButton
          size="xl"
          block
          @click="open = false"
        >
          Отмена
        </UButton>
      </template>
    </div>
  </AdaptiveOverlay>
</template>
