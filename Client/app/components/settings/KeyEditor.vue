<script setup lang="ts">
// Ключ OpenAI: entered once, checked with OpenAI before it is kept. ?key in the URL so back closes it
// and «Добавить ключ» on Главная can open it directly.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from '#imports'
import { useDataStore } from '~/stores/data'
import { useNotify } from '~/composables/useNotify'
import { checkKey, ModelError } from '~/domain/openai'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'

const data = useDataStore()
const notify = useNotify()
const route = useRoute()
const router = useRouter()

const open = computed({
  get: () => route.query.key !== undefined,
  set: (v) => {
    if (v) {
      void router.push({ query: { ...route.query, key: null } })
      return
    }
    if (route.query.key === undefined) return
    if (window.history.state?.back) router.back()
    else {
      const { key: _, ...query } = route.query
      void router.replace({ query })
    }
  }
})

const draft = ref('')
const shown = ref(false)
const checking = ref(false)
const error = ref('')

watch(open, (v) => {
  if (!v) return
  draft.value = data.settings.apiKey
  shown.value = false
  error.value = ''
}, { immediate: true })
watch(draft, () => {
  error.value = ''
})

async function save() {
  const key = draft.value.trim()
  if (!key) return remove()
  checking.value = true
  try {
    if (await checkKey(key)) {
      data.setSettings({ apiKey: key, keyState: 'ok' })
      open.value = false
      notify('Ключ работает', undefined, 3000)
    } else {
      error.value = 'Ключ не подошёл. Проверь, что он скопирован целиком'
    }
  } catch (e) {
    if (!(e instanceof ModelError && e.reason === 'offline')) throw e
    // Offline: keep it, Авто checks it on the first real call
    data.setSettings({ apiKey: key, keyState: 'unknown' })
    open.value = false
    notify('Нет сети: ключ сохранён, проверится при первой записи', undefined, 4000)
  } finally {
    checking.value = false
  }
}

function remove() {
  data.setSettings({ apiKey: '', keyState: 'unknown' })
  open.value = false
  notify('Ключ удалён: работают только простые правила', undefined, 4000)
}

defineExpose({ open: () => open.value = true })
</script>

<template>
  <AdaptiveOverlay
    v-model:open="open"
    title="Ключ OpenAI"
    dialog
  >
    <form
      class="flex flex-col gap-2.5 px-2 pt-1 pb-2"
      @submit.prevent="save"
    >
      <UInput
        v-model="draft"
        :type="shown ? 'text' : 'password'"
        placeholder="sk-…"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint="done"
        autofocus
        aria-label="Ключ OpenAI"
        :aria-invalid="!!error"
        aria-describedby="key-help"
        :ui="{ base: 'font-mono tracking-wide' }"
      >
        <template #trailing>
          <UButton
            :icon="shown ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            variant="ghost"
            square
            size="sm"
            :aria-label="shown ? 'Скрыть ключ' : 'Показать ключ'"
            :aria-pressed="shown"
            @click="shown = !shown"
          />
        </template>
      </UInput>
      <p
        v-if="error"
        class="flex items-center gap-1.5 text-13 text-warn-ink"
        role="alert"
      >
        <UIcon
          name="i-lucide-circle-alert"
          class="size-4 shrink-0"
        />{{ error }}
      </p>
      <p
        id="key-help"
        class="text-13 leading-snug text-toned"
      >
        Ключ хранится только в этом браузере и уходит только в OpenAI, в экспорт он не попадает.
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noopener"
          class="text-accent-ink underline underline-offset-2"
        >Где взять ключ</a>
      </p>
      <div class="flex items-center gap-2 pt-1">
        <UButton
          v-if="data.settings.apiKey"
          color="error"
          variant="ghost"
          size="lg"
          class="-ml-3 lg:h-9 lg:text-sm"
          @click="remove"
        >
          Удалить ключ
        </UButton>
        <span class="flex-1" />
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
          :loading="checking"
          :disabled="!draft.trim() && !data.settings.apiKey"
        >
          {{ checking ? 'Проверяю' : 'Сохранить' }}
        </UButton>
      </div>
    </form>
  </AdaptiveOverlay>
</template>
