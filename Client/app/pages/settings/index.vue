<script setup lang="ts">
// Настройки: Авто, Данные, Оформление (v23, B6: a copy is what one comes back for, the theme is set once).
// Everything here acts at once, nothing to save.
import { computed, onMounted, ref, shallowRef, useTemplateRef } from 'vue'
import { useColorMode, useHead, useRoute, useRouter } from '#imports'
import type { ModelChoice } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useCloudStore } from '~/stores/cloud'
import { useUiStore } from '~/stores/ui'
import { useScreen } from '~/composables/useScreen'
import { useNotify } from '~/composables/useNotify'
import { useNow } from '~/composables/useNow'
import { checkConnection, ModelError, PROVIDERS } from '~/domain/model'
import { copyDue } from '~/domain/keep'
import { finishOpenRouter } from '~/domain/openrouter'
import { measure, parseSnapshot, sizeText, type Snapshot } from '~/domain/export'
import { formatDate } from '~/domain/dates'
import AppScreen from '~/components/shell/AppScreen.vue'
import BackHeader from '~/components/shell/BackHeader.vue'
import TitleHeader from '~/components/shell/TitleHeader.vue'
import SegmentedControl from '~/components/common/SegmentedControl.vue'
import CopyMenu from '~/components/settings/CopyMenu.vue'
import SettingRow from '~/components/settings/SettingRow.vue'
import ConnectionEditor from '~/components/settings/ConnectionEditor.vue'
import SyncEditor from '~/components/settings/SyncEditor.vue'
import DescriptionList from '~/components/settings/DescriptionList.vue'
import ImportSheet from '~/components/settings/ImportSheet.vue'
import StoreWarning from '~/components/home/StoreWarning.vue'
import { onlyCollects } from '~/domain/collect'

useHead({ title: 'Настройки · Cerulean' })

const data = useDataStore()
const cloud = useCloudStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()
const notify = useNotify()
const colorMode = useColorMode()
const { isDesktop } = useScreen()
const keyEditor = useTemplateRef<InstanceType<typeof ConnectionEditor>>('keyEditor')
const syncEditor = useTemplateRef<InstanceType<typeof SyncEditor>>('syncEditor')

// Авто

const key = computed(() => data.settings.apiKey)
const service = computed(() => PROVIDERS[data.settings.provider].name)
const keyStatus = computed(() => {
  if (!key.value) return { text: 'Без ключа работают только простые правила', tone: undefined, dot: undefined }
  if (data.settings.keyState === 'bad') return { text: 'Не работает: проверь ключ и модель', tone: 'warn' as const, dot: 'warn' as const }
  // v23 (M11, F16): «OpenAI · подключено»; the key and the model live in the connection's own screen
  if (data.settings.keyState === 'ok') return { text: `${service.value} · подключено`, tone: undefined, dot: 'ok' as const }
  return { text: 'Ещё не проверено · не попадает в экспорт', tone: undefined, dot: 'faint' as const }
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
// A page that only collects files nothing by words, so it has no «Что сюда класть» (v24 fixes, 16)
const userPages = computed(() => data.livePages.filter(p => p.kind === 'page' && !onlyCollects(p)))
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

const now = useNow()
const copiedAt = computed(() => data.settings.copiedAt)
const copyHint = computed(() => `JSON или Markdown${copiedAt.value ? ` · последняя ${formatDate(copiedAt.value, now.value)}` : ''}`)
/** The status line carries the copy's state (v23, B6, M11): «копии нет» or «копия 12 сентября» */
const copyState = computed(() => copiedAt.value ? `копия ${formatDate(copiedAt.value, now.value)}` : 'копии нет')
/** «Сохранить» in the status line while a copy is due: none yet, or the monthly reminder of Главная is due */
const copyNeeded = computed(() => !copiedAt.value || copyDue(data.settings, Object.values(data.records), now.value, data.persisted, cloud.working))
const copying = ref(false)

// Синхронизация (sync delta, items 1, 2, 11)

const syncState = computed(() => cloud.state(now.value))
/** The status line while sync is on: the copy is in the bucket (its name with unbroken hyphens), or sync stopped */
const syncLine = computed(() => cloud.meta ? `Работает офлайн, копия в бакете «${cloud.meta.bucket.replace(/-/g, '\u2011')}»${cloud.stopped ? ' · синхронизация остановлена' : ''}` : '')

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
  // While sync is on only this browser is cleared: sync turns off, its key goes, the bucket keeps its copy
  const bucket = cloud.meta?.bucket.replace(/-/g, '\u2011')
  ui.confirm({
    title: 'Удалить всё?',
    text: bucket
      ? `Удалятся ${size} и ключи этого браузера, синхронизация выключится. Копия в бакете «${bucket}» останется.`
      : `Удалятся ${size}${key.value ? ' и ключ' : ''}, вернуть их будет нельзя. Сначала можно сохранить копию.`,
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

    <!-- Desktop: the rows' buttons sit in the raised chip fill, as on Settings in the mockup -->
    <div class="mx-auto w-full pb-8 lg:max-w-196 lg:px-8 lg:pb-16 lg:raised">
      <h1 class="px-4 pt-1 text-title text-highlighted lg:hidden">
        Настройки
      </h1>
      <StoreWarning
        v-if="data.storageError"
        place="settings"
        class="mx-4 mt-2 lg:mx-0 lg:mt-0"
      />
      <!-- The data state and its one action; no copy yet is a faint dot, never the ok green (v23, B6, M11) -->
      <div
        v-else
        class="flex items-start gap-2 px-4 pt-1.5 pb-0.5 text-sm leading-5 text-toned lg:px-0 lg:pt-0 lg:pb-0"
        role="status"
      >
        <span
          class="mt-1.5 size-2 shrink-0 rounded-full"
          :class="cloud.on ? (cloud.stopped ? 'bg-warn' : 'bg-ok') : copiedAt ? 'bg-ok' : 'bg-faint'"
          aria-hidden="true"
        />
        <!-- While sync is on the data is no longer at risk of the browser clearing it: no «копии нет · Сохранить» -->
        <span v-if="cloud.on">{{ syncLine }}</span>
        <span v-else>Работает офлайн, всё в этом браузере · <span class="whitespace-nowrap">{{ copyState }}<template v-if="copyNeeded"> · <CopyMenu align="start">
          <button
            type="button"
            class="hit-44 cursor-pointer text-accent-ink hover:underline"
            aria-label="Сохранить копию"
          >Сохранить</button>
        </CopyMenu></template></span></span>
      </div>

      <!-- Авто -->
      <section aria-labelledby="s-auto">
        <h2
          id="s-auto"
          class="px-4 pt-4 text-cap leading-6 text-toned lg:px-0 lg:pt-7.5 lg:pb-0.5 lg:leading-5"
        >
          Раскладка
        </h2>
        <!-- Desktop: line 2 is the real state with its dot (S10); «Без ключа…» only without a key -->
        <SettingRow
          label="Подключение"
          icon="i-lucide-key-round"
          :hint="keyStatus.text"
          :hint-tone="keyStatus.tone"
          :dot="key ? keyStatus.dot : undefined"
          :value="key ? undefined : 'Добавить'"
          opens
          @open="keyEditor?.open()"
        >
          <div class="flex items-center gap-3">
            <UButton
              :class="{ 'text-accent-ink': !key }"
              @click="keyEditor?.open()"
            >
              {{ key ? 'Изменить' : 'Добавить ключ' }}
            </UButton>
          </div>
        </SettingRow>
        <SettingRow
          v-if="key && !data.settings.modelId && data.settings.provider !== 'custom'"
          label="Модель"
          icon="i-lucide-gauge"
          hint="Точная медленнее, зато лучше с непонятными записями"
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
          label="Что класть на страницы"
          icon="i-lucide-lightbulb"
          hint="По этим словам решается, куда положить запись"
          :value="`${described} из ${userPages.length}`"
          opens
          @open="router.push('/settings/descriptions')"
        >
          <UButton
            variant="ghost"
            trailing-icon="i-lucide-chevron-right"
            :aria-expanded="descOpen"
            aria-controls="desc-table"
            :ui="{ trailingIcon: `size-4 text-dimmed transition-transform ${descOpen ? 'rotate-90' : ''}` }"
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

      <!-- Данные -->
      <section
        ref="dataSection"
        aria-labelledby="s-data"
        class="scroll-mt-4"
      >
        <h2
          id="s-data"
          class="px-4 pt-4 text-cap leading-6 text-toned lg:px-0 lg:pt-7.5 lg:pb-0.5 lg:leading-5"
        >
          Данные
        </h2>
        <!-- Off: a grey «Подключить ›» like «Подключение»'s «Добавить ›»; stopped by an error: «Исправить ›» in accent -->
        <SettingRow
          v-if="!data.storageError"
          label="Синхронизация"
          icon="i-lucide-cloud"
          :hint="syncState.text"
          :hint-tone="syncState.warn ? 'warn' : undefined"
          :dot="syncState.warn ? 'warn' : undefined"
          :warn-dot="syncState.warn"
          :value="!cloud.on ? 'Подключить' : cloud.meta?.error ? 'Исправить' : undefined"
          :value-tone="cloud.meta?.error ? 'accent' : undefined"
          opens
          @open="syncEditor?.open()"
        >
          <UButton
            :class="{ 'text-accent-ink': cloud.meta?.error }"
            @click="syncEditor?.open()"
          >
            {{ !cloud.on ? 'Подключить' : cloud.meta?.error ? 'Исправить' : 'Открыть' }}
          </UButton>
        </SettingRow>
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
              class="text-accent-ink"
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
          @open="copying = true"
        >
          <!-- Desktop: one row too, the same two formats at its right end; while nothing is kept «Сейчас» says it in
               accent words (SettingsNoStore) -->
          <CopyMenu align="end">
            <UButton
              variant="ghost"
              trailing-icon="i-lucide-chevron-right"
              aria-label="Сохранить копию"
              :class="data.storageError ? 'text-accent-ink' : 'text-dimmed'"
            >
              {{ data.storageError ? 'Сейчас' : '' }}
            </UButton>
          </CopyMenu>
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
          <!-- Desktop: the button alone, as drawn; the phone's line keeps the count as its value -->
          <UButton to="/settings/trash">
            Открыть
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
          Ключи хранятся только в этом браузере: в копию и в бакет они не попадают.
        </p>
      </section>

      <!-- Оформление -->
      <section aria-labelledby="s-look">
        <h2
          id="s-look"
          class="px-4 pt-4 text-cap leading-6 text-toned lg:px-0 lg:pt-7.5 lg:pb-0.5 lg:leading-5"
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
          hint="На Главной только названия страниц"
        >
          <USwitch
            v-model="compactRows"
            aria-label="Компактные строки"
          />
        </SettingRow>
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
    <SyncEditor ref="syncEditor" />
    <CopyMenu
      v-if="!isDesktop"
      v-model:open="copying"
      bare
    />
    <ImportSheet
      v-model:open="importing"
      :file="loaded"
    />
  </AppScreen>
</template>
