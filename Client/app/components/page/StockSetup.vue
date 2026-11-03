<script setup lang="ts">
import { ref } from 'vue'
import type { Id, Page } from '~/domain/types'
import { uid } from '~/domain/ids'
import { enableStock, uniqueStockName } from '~/domain/stock'
import { useDataStore } from '~/stores/data'

const props = defineProps<{ pageId: Id, viewId: Id }>()
const emit = defineEmits<{ close: [] }>()
const data = useDataStore()

function names(page: Page) {
  const amount = uniqueStockName('Осталось', page.props.map(p => p.name))
  const norm = uniqueStockName('Норма', [...page.props.map(p => p.name), amount])
  const buy = uniqueStockName('Купить с запасами', page.views.map(v => v.name))
  const stock = uniqueStockName('Запасы', [...page.views.map(v => v.name), buy])
  return { amount, norm, buy, stock }
}

const initial = data.pages[props.pageId]
const proposed = ref(initial ? names(initial) : null)
const changed = ref(false)

function confirm() {
  const page = data.pages[props.pageId]
  if (!page || page.deletedAt || page.stocks?.length) {
    emit('close')
    return
  }
  const current = names(page)
  if (JSON.stringify(current) !== JSON.stringify(proposed.value)) {
    proposed.value = current
    changed.value = true
    return
  }
  const ids = { amount: uid(), norm: uid(), buy: uid(), stock: uid() }
  const next = enableStock(page, ids, page.views.find(v => v.id === props.viewId))
  data.updatePage(page.id, { props: next.props, views: next.views, stocks: next.stocks })
  emit('close')
}
</script>

<template>
  <div
    v-if="proposed"
    class="flex flex-col gap-4 px-4 pt-2 pb-4"
  >
    <h3 class="text-base font-semibold text-highlighted">
      Включить запасы?
    </h3>
    <p class="text-base text-default lg:text-15">
      Добавятся свойства «{{ proposed.amount }}» и «{{ proposed.norm }}» и отдельные виды «{{ proposed.buy }}» и «{{ proposed.stock }}».
    </p>
    <p class="text-base text-toned lg:text-15">
      Прежние записи, свойства, виды и настройки не изменятся. Остатки не заполнятся автоматически, существующие данные не будут привязаны к новым свойствам. Текущая вкладка останется открытой.
    </p>
    <p
      v-if="changed"
      role="status"
      class="text-base text-toned lg:text-15"
    >
      Имена изменились. Проверьте их и подтвердите включение ещё раз.
    </p>
    <div class="flex justify-end gap-2">
      <UButton
        variant="ghost"
        @click="emit('close')"
      >
        Отмена
      </UButton>
      <UButton @click="confirm">
        Включить
      </UButton>
    </div>
  </div>
</template>
