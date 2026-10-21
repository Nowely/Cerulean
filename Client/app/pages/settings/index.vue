<script setup lang="ts">
// Настройки: Авто, Оформление, Данные. Everything here acts at once, nothing to save.
import { computed, onMounted, ref, shallowRef, useTemplateRef } from 'vue'
import { useColorMode, useHead, useRoute, useRouter } from '#imports'
import type { ModelChoice } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useScreen } from '~/composables/useScreen'
import { useNotify } from '~/composables/useNotify'
import { useNow } from '~/composables/useNow'
import { useCopy } from '~/composables/useCopy'
import { checkConnection, maskKey, modelOf, ModelError, PROVIDERS } from '~/domain/model'
import { finishOpenRouter } from '~/domain/openrouter'
import { measure, parseSnapshot, sizeText, type Snapshot } from '~/domain/export'
import { formatDate } from '~/domain/dates'
import AppScreen from '~/components/shell/AppScreen.vue'
import BackHeader from '~/components/shell/BackHeader.vue'
import TitleHeader from '~/components/shell/TitleHeader.vue'
import SegmentedControl from '~/components/common/SegmentedControl.vue'
import ActionMenu from '~/components/overlay/ActionMenu.vue'
import SettingRow from '~/components/settings/SettingRow.vue'
import ConnectionEditor from '~/components/settings/ConnectionEditor.vue'
import DescriptionList from '~/components/settings/DescriptionList.vue'
import ImportSheet from '~/components/settings/ImportSheet.vue'
import StoreWarning from '~/components/home/StoreWarning.vue'

useHead({ title: 'Настройки · Cerulean' })

const data = useDataStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()
const notify = useNotify()
const colorMode = useColorMode()
const { isDesktop } = useScreen()
const keyEditor = useTemplateRef<InstanceType<typeof ConnectionEditor>>('keyEditor')

// Авто

const key = computed(() => data.settings.apiKey)
const service = computed(() => PROVIDERS[data.settings.provider].name)
const keyStatus = computed(() => {
  if (!key.value) return { text: 'Без ключа работают только простые правила', tone: undefined, icon: '' }
  if (data.settings.keyState === 'bad') return { text: 'Не работает: проверь ключ и модель', tone: 'warn' as const, icon: 'i-lucide-circle-alert' }
  // «openai/gpt-6-luna» reads as «gpt-6-luna»: the service is already on the row
  if (data.settings.keyState === 'ok') return { text: `Работает · ${modelOf(data.settings).split('/').pop()}`, tone: undefined, icon: 'i-lucide-check' }
  return { text: 'Ещё не проверено · не попадает в экспорт', tone: undefined, icon: '' }
})

async function check() {
  if (!key.value || data.settings.keyState !== 'unknown' || !navigator.onLine) return
  try {
    data.setSettings({ keyState: await checkConnection(data.settings) === 'ok' ? 'ok' : 'bad' })
  } catch (e) {
    if (!(e instanceof ModelError && e.reason === 'offline')) throw e
  }
}

onMounted(async () => {
  // Back from «Войти через OpenRouter» with a code: it becomes the key
  const code = route.query.code
  if (typeof code === 'string') {
    const { code: _, ...query } = route.query
    void router.replace({ query })
    try {
      const apiKey = await finishOpenRouter(code)
      if (apiKey) {
        data.setSettings({ provider: 'openrouter', apiKey, baseUrl: '', modelId: '', keyState: 'unknown' })
        notify('Вход через OpenRouter выполнен', undefined, 3000)
      }
    } catch {
      notify('Не получилось войти через OpenRouter. Попробуй ещё раз', undefined, 5000)
    }
  }
  // A connection saved offline is checked as soon as Настройки is opened with a network
  await check()
})

const model = computed({
  get: () => data.settings.model,
  set: (v: ModelChoice) => data.setSettings({ model: v })
})
const rulesFirst = computed({
  get: () => data.settings.rulesFirst,
  set: (v: boolean) => data.setSettings({ rulesFirst: v })
})
const userPages = computed(() => data.livePages.filter(p => p.kind === 'page'))
const described = computed(() => userPages.value.filter(p => p.description).length)
const descOpen = ref(false)

// Оформление

type Theme = 'light' | 'dark' | 'system'
const theme = computed({
  get: () => colorMode.preference as Theme,
  set: (v: Theme) => { colorMode.preference = v }
})
const compactRows = computed({
  get: () => data.settings.homeRows === 'compact',
  set: (v: boolean) => data.setSettings({ homeRows: v ? 'compact' : 'summary' })
})

// Данные

// The browser may clear site data when the disk runs short, unless asked to keep it (null: it cannot say)
async function persist() {
  if (data.persisted) return
  if (!await data.persist()) notify('Браузер не разрешил. Сохраняй копию время от времени', undefined, 4000)
}

const { saveCopy } = useCopy()
const now = useNow()
const copyHint = computed(() => `JSON или Markdown · ${data.settings.copiedAt ? `последняя ${formatDate(data.settings.copiedAt, now.value)}` : 'ещё не сохранялась'}`)
const copying = ref(false)
const copyItems = [[
  { label: 'JSON', icon: 'i-lucide-file-json', value: 'можно загрузить обратно', onSelect: () => saveCopy('json') },
  { label: 'Markdown', icon: 'i-lucide-file-text', value: 'читать и вставлять', onSelect: () => saveCopy('md') }
]]

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const loaded = shallowRef<{ name: string, snap: Snapshot } | null>(null)
const importing = ref(false)
async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    loaded.value = { name: file.name, snap: parseSnapshot(await file.text()) }
    importing.value = true
  } catch (err) {
    notify(err instanceof Error ? err.message : 'Не удалось прочитать файл', undefined, 5000)
  }
}

const trashCount = computed(() => data.trash.length)

function wipe() {
  const size = sizeText(measure({ pages: Object.values(data.pages), records: Object.values(data.records) }))
  ui.confirm({
    title: 'Удалить всё?',
    text: `Удалятся ${size}${key.value ? ' и ключ' : ''}, вернуть их будет нельзя. Сначала можно сохранить копию.`,
    action: 'Удалить всё',
    run: async () => {
      await data.wipe()
      void router.push('/')
      notify('Всё удалено', undefined, 3000)
    }
  })
}

// «Освободить место ›» after a failed save comes here: /settings#data
const dataSection = useTemplateRef<HTMLElement>('dataSection')
onMounted(() => {
  if (route.hash === '#data') dataSection.value?.scrollIntoView({ block: 'start' })
})
</script>

<template>
  <AppScreen>
    <template #header>
      <BackHeader
        to="/"
        label="Главная"
      />
      <TitleHeader title="Настройки" />
    </template>

    <div class="mx-auto w-full pb-8 lg:max-w-196 lg:px-8 lg:pb-16">
      <h1 class="px-5 pb-1 text-title text-highlighted lg:hidden">
        Настройки
      </h1>
      <StoreWarning
        v-if="data.storageError"
        place="settings"
        class="mx-4 mt-2 lg:mx-0 lg:mt-0"
      />
      <div
        v-else
        class="flex items-center gap-2.5 px-5 pt-2 pb-1 text-sm text-default lg:gap-2 lg:px-0 lg:pt-0 lg:text-sm lg:text-toned"
        role="status"
      >
        <span
          class="size-2 shrink-0 rounded-full bg-ok"
          aria-hidden="true"
        />
        <span>Работает офлайн, всё хранится в этом браузере</span>
      </div>

      <!-- Авто -->
      <section aria-labelledby="s-auto">
        <h2
          id="s-auto"
          class="px-5 pt-5 pb-1 text-cap text-toned lg:px-0 lg:pt-7.5 lg:pb-0.5"
        >
          Авто
        </h2>
        <SettingRow
          label="Подключение"
          icon="i-lucide-key-round"
          :hint="keyStatus.text"
          :hint-tone="keyStatus.tone"
          desk-hint="Без ключа работают только простые правила"
          :value="key ? `${service} · ${maskKey(key)}` : 'Добавить'"
          :value-wraps="!!key"
          opens
          @open="keyEditor?.open()"
        >
          <div class="flex flex-col items-end gap-1.5">
            <div class="flex items-center gap-2">
              <span
                v-if="key"
                class="inline-flex h-9 items-center rounded-chip border border-default bg-default px-3 text-sm tracking-wide text-highlighted"
              >{{ service }} · {{ maskKey(key) }}</span>
              <UButton
                :color="key ? 'neutral' : 'primary'"
                :variant="key ? 'outline' : 'solid'"
                @click="keyEditor?.open()"
              >
                {{ key ? 'Изменить' : 'Добавить ключ' }}
              </UButton>
            </div>
            <p
              v-if="key"
              class="flex items-center gap-1.5 text-13"
              :class="keyStatus.tone === 'warn' ? 'text-warn-ink' : keyStatus.icon ? 'text-ok' : 'text-toned'"
            >
              <UIcon
                v-if="keyStatus.icon"
                :name="keyStatus.icon"
                class="size-3.5"
              />{{ keyStatus.text }}
            </p>
          </div>
        </SettingRow>
        <SettingRow
          v-if="key && !data.settings.modelId && data.settings.provider !== 'custom'"
          label="Модель"
          icon="i-lucide-split"
          desk-hint="Точная медленнее, зато лучше с непонятными записями"
          below
        >
          <SegmentedControl
            v-model="model"
            label="Модель"
            :options="[{ value: 'fast', label: 'Быстрая' }, { value: 'exact', label: 'Точная' }]"
            class="lg:w-57"
          />
        </SettingRow>
        <SettingRow
          label="Сначала простые правила"
          icon="i-lucide-text"
          hint="Понятное разбирается на устройстве, в модель уходит только остальное"
        >
          <USwitch
            v-model="rulesFirst"
            aria-label="Сначала простые правила"
          />
        </SettingRow>
        <SettingRow
          label="Описания для Авто"
          icon="i-lucide-lightbulb"
          hint="Что класть на каждую страницу"
          desk-hint="По описанию записи попадают на нужную страницу"
          :value="`${described}`"
          opens
          @open="router.push('/settings/descriptions')"
        >
          <UButton
            variant="ghost"
            trailing-icon="i-lucide-chevron-down"
            :aria-expanded="descOpen"
            aria-controls="desc-table"
            :ui="{ trailingIcon: descOpen ? 'rotate-180' : '' }"
            class="text-15"
            @click="descOpen = !descOpen"
          >
            {{ described }} из {{ userPages.length }}
          </UButton>
          <template
            v-if="descOpen"
            #after
          >
            <div
              id="desc-table"
              class="w-full"
            >
              <DescriptionList variant="table" />
            </div>
          </template>
        </SettingRow>
      </section>

      <!-- Оформление -->
      <section aria-labelledby="s-look">
        <h2
          id="s-look"
          class="px-5 pt-5 pb-1 text-cap text-toned lg:px-0 lg:pt-7.5 lg:pb-0.5"
        >
          Оформление
        </h2>
        <SettingRow
          label="Тема"
          icon="i-lucide-moon"
          below
        >
          <SegmentedControl
            v-model="theme"
            label="Тема"
            :options="[{ value: 'light', label: 'Светлая' }, { value: 'dark', label: 'Тёмная' }, { value: 'system', label: 'Как в системе' }]"
            class="lg:w-90"
          />
        </SettingRow>
        <SettingRow
          label="Компактные строки"
          icon="i-lucide-rows-3"
          hint="На Главной только названия страниц, без сводки"
        >
          <USwitch
            v-model="compactRows"
            aria-label="Компактные строки"
          />
        </SettingRow>
      </section>

      <!-- Данные -->
      <section
        ref="dataSection"
        aria-labelledby="s-data"
        class="scroll-mt-4"
      >
        <h2
          id="s-data"
          class="px-5 pt-5 pb-1 text-cap text-toned lg:px-0 lg:pt-7.5 lg:pb-0.5"
        >
          Данные
        </h2>
        <SettingRow
          v-if="data.persisted !== null && !data.storageError"
          label="Не удалять при нехватке места"
          icon="i-lucide-shield"
          :hint="data.persisted ? 'Браузер не удалит записи сам' : 'Без этого браузер может очистить данные сам'"
          :value="data.persisted ? 'Включено' : 'Включить'"
          :value-tone="data.persisted ? undefined : 'accent'"
          :opens="!data.persisted"
          acts
          @open="persist"
        >
          <!-- A phone says it in the value -->
          <template v-if="isDesktop">
            <p
              v-if="data.persisted"
              class="flex items-center gap-2 text-sm text-default"
            >
              <span
                class="size-2 rounded-full bg-ok"
                aria-hidden="true"
              />Включено
            </p>
            <UButton
              v-else
              @click="persist"
            >
              Включить
            </UButton>
          </template>
        </SettingRow>
        <SettingRow
          label="Сохранить копию"
          icon="i-lucide-download"
          :hint="copyHint"
          :value="data.storageError ? 'Сейчас' : undefined"
          value-tone="accent"
          opens
          acts
          @open="copying = true"
        >
          <div class="flex gap-2">
            <UButton
              :color="data.storageError ? 'primary' : 'neutral'"
              :variant="data.storageError ? 'solid' : 'outline'"
              @click="saveCopy('json')"
            >
              JSON
            </UButton>
            <UButton @click="saveCopy('md')">
              Markdown
            </UButton>
          </div>
        </SettingRow>
        <SettingRow
          label="Загрузить копию"
          icon="i-lucide-upload"
          hint="Добавить к текущим или заменить всё"
          opens
          @open="fileInput?.click()"
        >
          <UButton @click="fileInput?.click()">
            Выбрать файл
          </UButton>
        </SettingRow>
        <SettingRow
          label="Корзина"
          icon="i-lucide-trash-2"
          hint="Удалённое хранится 30 дней"
          :value="trashCount ? `${trashCount}` : undefined"
          opens
          @open="router.push('/settings/trash')"
        >
          <UButton to="/settings/trash">
            Открыть<span
              v-if="trashCount"
              class="inline-flex h-5 min-w-5 items-center justify-center rounded-badge bg-trk px-1.5 text-xs text-toned"
            >{{ trashCount }}</span>
          </UButton>
        </SettingRow>
        <SettingRow
          label="Удалить всё"
          icon="i-lucide-triangle-alert"
          hint="Попросит подтверждения"
          desk-hint="Страницы, записи и ключ из этого браузера"
          tone="warn"
          opens
          @open="wipe"
        >
          <UButton
            color="error"
            variant="outline"
            @click="wipe"
          >
            Удалить всё
          </UButton>
        </SettingRow>
        <p class="px-5 pt-3.5 text-13 leading-normal text-toned lg:px-0 lg:pt-4.5 lg:text-sm">
          Синхронизации между устройствами нет: данные переносятся экспортом. Ключ хранится здесь же и уходит только в выбранный сервис.
        </p>
      </section>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".json,application/json"
      class="hidden"
      @change="onFile"
    >
    <ConnectionEditor ref="keyEditor" />
    <ActionMenu
      v-if="!isDesktop"
      v-model:open="copying"
      :items="copyItems"
      title="Сохранить копию"
      label="Сохранить копию"
      bare
    />
    <ImportSheet
      v-model:open="importing"
      :file="loaded"
    />
  </AppScreen>
</template>
