<script setup lang="ts">
// Подключение модели: the service, its key and, if wanted, a model of one's own. Checked with one small request
// before it is kept. ?key in the URL so back closes it and «Добавить ключ» on Главная can open it directly.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from '#imports'
import type { Provider } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNotify } from '~/composables/useNotify'
import { checkConnection, modelOf, ModelError, PROVIDERS, type Connection } from '~/domain/model'
import { startOpenRouter } from '~/domain/openrouter'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'
import SegmentedControl from '../common/SegmentedControl.vue'

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

const SERVICES = (Object.keys(PROVIDERS) as Provider[]).map(p => ({ value: p, label: PROVIDERS[p].name }))
const provider = ref<Provider>('openai')
const key = ref('')
const baseUrl = ref('')
const modelId = ref('')
const shown = ref(false)
const checking = ref(false)
const error = ref('')

watch(open, (v) => {
  if (!v) return
  provider.value = data.settings.provider
  key.value = data.settings.apiKey
  baseUrl.value = data.settings.baseUrl
  modelId.value = data.settings.modelId
  shown.value = false
  error.value = ''
}, { immediate: true })
// A key belongs to its service: another service starts empty, the saved one comes back with its own
watch(provider, (p) => {
  const saved = p === data.settings.provider
  key.value = saved ? data.settings.apiKey : ''
  modelId.value = saved ? data.settings.modelId : ''
  error.value = ''
})
watch([key, baseUrl, modelId], () => {
  error.value = ''
})

const info = computed(() => PROVIDERS[provider.value])
const custom = computed(() => provider.value === 'custom')
const conn = computed<Connection>(() => ({
  provider: provider.value,
  apiKey: key.value.trim(),
  baseUrl: baseUrl.value.trim(),
  modelId: modelId.value.trim(),
  model: data.settings.model
}))
const complete = computed(() => !!conn.value.apiKey && (!custom.value || (!!conn.value.baseUrl && !!conn.value.modelId)))
const saved = computed(() => !!data.settings.apiKey)

async function save() {
  if (!conn.value.apiKey) return saved.value ? remove() : undefined
  if (!complete.value) {
    error.value = 'Нужны адрес API и модель'
    return
  }
  checking.value = true
  try {
    const result = await checkConnection(conn.value)
    if (result === 'ok') {
      data.setSettings({ ...conn.value, keyState: 'ok' })
      open.value = false
      notify(`Подключено: ${modelOf(conn.value)}`, undefined, 3000)
    } else {
      error.value = result === 'key'
        ? 'Ключ не подошёл. Проверь, что он скопирован целиком'
        : result === 'model'
          ? `У ${info.value.name} нет модели «${modelOf(conn.value)}»`
          : custom.value ? 'Не получилось: проверь адрес, ключ и модель' : 'Сервис ответил ошибкой. Попробуй ещё раз'
    }
  } catch (e) {
    if (!(e instanceof ModelError && e.reason === 'offline')) throw e
    // Offline: keep it, Авто checks it on the first real call
    data.setSettings({ ...conn.value, keyState: 'unknown' })
    open.value = false
    notify('Нет сети: подключение сохранено, проверится при первой записи', undefined, 4000)
  } finally {
    checking.value = false
  }
}

function remove() {
  data.setSettings({ apiKey: '', keyState: 'unknown' })
  open.value = false
  notify('Ключ удалён: работают только простые правила', undefined, 4000)
}

const signingIn = ref(false)
async function signIn() {
  signingIn.value = true
  await startOpenRouter(`${window.location.origin}/settings`)
}

defineExpose({ open: () => open.value = true })
</script>

<template>
  <AdaptiveOverlay
    v-model:open="open"
    title="Подключение"
    dialog
  >
    <form
      class="flex flex-col gap-2.5 px-2 pt-1 pb-2"
      @submit.prevent="save"
    >
      <SegmentedControl
        v-model="provider"
        :options="SERVICES"
        label="Сервис"
      />

      <template v-if="provider === 'openrouter'">
        <UButton
          color="primary"
          variant="solid"
          size="lg"
          block
          icon="i-lucide-log-in"
          class="mt-1 lg:h-9 lg:text-sm"
          :loading="signingIn"
          @click="signIn"
        >
          Войти через OpenRouter
        </UButton>
        <p class="text-13 leading-snug text-toned">
          Ключ появится в аккаунте OpenRouter, запросы оплачиваются с его баланса. Или вставь готовый ключ:
        </p>
      </template>

      <UInput
        v-if="custom"
        v-model="baseUrl"
        type="url"
        placeholder="https://…/v1"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        aria-label="Адрес API"
        :ui="{ base: 'font-mono' }"
      />
      <UInput
        v-model="key"
        :type="shown ? 'text' : 'password'"
        :placeholder="info.keyPlaceholder"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint="done"
        :autofocus="provider !== 'openrouter'"
        :aria-label="`Ключ ${custom ? 'API' : info.name}`"
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
      <UInput
        v-model="modelId"
        :placeholder="custom ? 'Модель' : `Модель: ${info.models[data.settings.model]}`"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        aria-label="Модель"
        :ui="{ base: 'font-mono' }"
      />
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
        <template v-if="!custom">
          Пустая модель: {{ info.models.fast }} для «Быстрая», {{ info.models.exact }} для «Точная».
        </template>
        Ключ хранится только в этом браузере и уходит только в {{ custom ? 'этот адрес' : info.name }}, в экспорт он не попадает.
        <a
          v-if="info.keysUrl"
          :href="info.keysUrl"
          target="_blank"
          rel="noopener"
          class="text-accent-ink underline underline-offset-2"
        >Где взять ключ</a>
      </p>
      <div class="flex items-center gap-2 pt-1">
        <UButton
          v-if="saved"
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
          :disabled="!conn.apiKey && !saved"
        >
          {{ checking ? 'Проверка…' : 'Сохранить' }}
        </UButton>
      </div>
    </form>
  </AdaptiveOverlay>
</template>
