<script setup lang="ts">
// Подключение модели: the service, its key and, if wanted, a model of one's own. Checked with one small request
// before it is kept. ?key in the URL so back closes it and «Добавить ключ» on Главная can open it directly.
// Every field has its label above it; «Сохранить» is there from the start and waits for what it needs.
// OpenRouter leads with «Войти через OpenRouter»; its manual form folds under «Вставить ключ вручную».
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
/** OpenRouter: the key typed by hand instead of signing in */
const manual = ref(false)
const checking = ref(false)
const error = ref('')

watch(open, (v) => {
  if (!v) return
  provider.value = data.settings.provider
  key.value = data.settings.apiKey
  baseUrl.value = data.settings.baseUrl
  modelId.value = data.settings.modelId
  shown.value = false
  manual.value = false
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
const urlOk = computed(() => /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(conn.value.baseUrl) || /^https?:\/\/localhost(:\d+)?(\/\S*)?$/i.test(conn.value.baseUrl))
const complete = computed(() => !!conn.value.apiKey && (!custom.value || (urlOk.value && !!conn.value.modelId)))
/** The form shows its fields: always, except OpenRouter before «Вставить ключ вручную» */
const form = computed(() => provider.value !== 'openrouter' || manual.value)
const saved = computed(() => !!data.settings.apiKey)

async function save() {
  if (!complete.value) return
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
      novalidate
      @submit.prevent="save"
    >
      <div>
        <p class="pb-1.5 text-cap text-toned">
          Сервис
        </p>
        <SegmentedControl
          v-model="provider"
          :options="SERVICES"
          label="Сервис"
        />
      </div>

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
          Ключ появится в аккаунте OpenRouter, запросы оплачиваются с его баланса.
        </p>
        <button
          v-if="!manual"
          type="button"
          class="-mx-1 flex h-11 cursor-pointer items-center gap-0.5 self-start rounded-item px-1 text-15 text-accent-ink hover:bg-muted lg:h-8 lg:text-sm lg:text-toned lg:hover:text-highlighted"
          :aria-expanded="manual"
          @click="manual = true"
        >
          Вставить ключ вручную<UIcon
            name="i-lucide-chevron-right"
            class="hidden size-4 lg:block"
          />
        </button>
      </template>

      <template v-if="form">
        <label
          v-if="custom"
          class="block"
        >
          <span class="block pb-1 text-caption text-toned">Адрес API</span>
          <UInput
            v-model="baseUrl"
            type="text"
            inputmode="url"
            placeholder="https://…/v1"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            class="w-full"
            :aria-invalid="!!conn.baseUrl && !urlOk"
            :ui="{ base: 'font-mono' }"
          />
          <span
            v-if="conn.baseUrl && !urlOk"
            class="mt-1 block text-13 text-warn-ink"
          >Адрес начинается с https://</span>
        </label>
        <label class="block">
          <span class="block pb-1 text-caption text-toned">Ключ {{ custom ? 'API' : info.name }}</span>
          <UInput
            v-model="key"
            :type="shown ? 'text' : 'password'"
            :placeholder="custom ? 'Ключ' : info.keyPlaceholder"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            enterkeyhint="done"
            :autofocus="provider !== 'openrouter'"
            class="w-full"
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
        </label>
        <label class="block">
          <span class="block pb-1 text-caption text-toned">Модель</span>
          <UInput
            v-model="modelId"
            :placeholder="custom ? 'Название модели' : info.models[data.settings.model]"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            class="w-full"
            :ui="{ base: 'font-mono' }"
          />
        </label>
      </template>
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
        v-if="form"
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
          v-if="form"
          type="submit"
          color="primary"
          variant="solid"
          size="lg"
          class="lg:h-9 lg:text-sm"
          :loading="checking"
          :disabled="!complete"
        >
          {{ checking ? 'Проверка…' : 'Сохранить' }}
        </UButton>
      </div>
    </form>
  </AdaptiveOverlay>
</template>
