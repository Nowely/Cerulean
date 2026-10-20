<script setup lang="ts">
// Настройки: Авто, Оформление, Данные. Everything here acts at once, nothing to save.
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { useColorMode, useHead, useRoute, useRouter } from '#imports'
import type { ModelChoice } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useScreen } from '~/composables/useScreen'
import { useNotify } from '~/composables/useNotify'
import { checkConnection, maskKey, modelOf, ModelError, PROVIDERS } from '~/domain/model'
import { finishOpenRouter } from '~/domain/openrouter'
import { parseSnapshot, toJSON, toMarkdown } from '~/domain/export'
import { dayKey } from '~/domain/dates'
import { count, RECORD_FORMS } from '~/domain/text'
import AppScreen from '~/components/shell/AppScreen.vue'
import BackHeader from '~/components/shell/BackHeader.vue'
import TitleHeader from '~/components/shell/TitleHeader.vue'
import SegmentedControl from '~/components/common/SegmentedControl.vue'
import ActionMenu from '~/components/overlay/ActionMenu.vue'
import SettingRow from '~/components/settings/SettingRow.vue'
import ConnectionEditor from '~/components/settings/ConnectionEditor.vue'
import DescriptionList from '~/components/settings/DescriptionList.vue'

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
  if (data.settings.keyState === 'ok') return { text: `Работает · ${modelOf(data.settings)}`, tone: undefined, icon: 'i-lucide-check' }
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

const stamp = () => dayKey(Date.now())

/** A phone gets the share sheet (Files, Telegram, mail); otherwise the file is downloaded */
async function save(name: string, text: string, type: string) {
  const file = new File([text], name, { type })
  if (!isDesktop.value && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function exportJson() {
  void save(`cerulean-${stamp()}.json`, toJSON(data.snapshot()), 'application/json')
}
function exportMarkdown() {
  const live = data.livePages.filter(p => p.kind === 'page' || p.kind === 'inbox')
  void save(`cerulean-${stamp()}.md`, toMarkdown(live, data.liveRecords, data.sectionList), 'text/markdown')
}
const exporting = ref(false)
const exportItems = [[
  { label: 'JSON', icon: 'i-lucide-file-json', value: 'для переноса и копии', onSelect: exportJson },
  { label: 'Markdown', icon: 'i-lucide-file-text', value: 'читать и вставлять', onSelect: exportMarkdown }
]]

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const snap = parseSnapshot(await file.text())
    const pages = snap.pages.filter(p => !p.deletedAt && p.kind === 'page').length
    const records = snap.records.filter(r => !r.deletedAt).length
    ui.confirm({
      title: 'Заменить всё данными из файла?',
      text: `В файле ${count(pages, ['страница', 'страницы', 'страниц'])} и ${count(records, RECORD_FORMS)}. Всё, что сейчас в этом браузере, заменится. Ключ останется.`,
      action: 'Заменить',
      run: async () => {
        await data.importSnapshot(snap)
        void router.push('/')
        notify('Данные из файла загружены', undefined, 3000)
      }
    })
  } catch (err) {
    notify(err instanceof Error ? err.message : 'Не удалось прочитать файл', undefined, 5000)
  }
}

const trashCount = computed(() => data.trash.length)

function wipe() {
  ui.confirm({
    title: 'Удалить всё?',
    text: 'Страницы, записи и ключ удалятся из этого браузера без возможности вернуть. Сначала можно сделать экспорт.',
    action: 'Удалить всё',
    run: async () => {
      await data.wipe()
      void router.push('/')
      notify('Всё удалено', undefined, 3000)
    }
  })
}

// The browser may clear site data when the disk is full, unless asked to keep it (null: no such API)
const persisted = ref<boolean | null>(null)
onMounted(async () => {
  persisted.value = 'storage' in navigator && 'persist' in navigator.storage ? await navigator.storage.persisted() : null
})
async function persist() {
  persisted.value = await navigator.storage.persist()
  if (!persisted.value) notify('Браузер не разрешил. Делай экспорт время от времени', undefined, 4000)
}
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

    <div class="mx-auto w-full pb-8 lg:max-w-180 lg:px-8 lg:pb-16">
      <h1 class="px-5 pb-1 text-28 font-semibold tracking-[-.015em] text-highlighted lg:hidden">
        Настройки
      </h1>
      <div
        class="flex items-center gap-2.5 px-5 pt-2 pb-1 text-sm text-default lg:-mt-2 lg:gap-2 lg:px-0 lg:pt-0 lg:text-sm lg:text-toned"
        role="status"
      >
        <template v-if="data.storageError">
          <UIcon
            name="i-lucide-circle-alert"
            class="size-4 shrink-0 text-warn"
          />
          <span class="text-warn-ink">Хранилище браузера недоступно: изменения пропадут, когда закроешь вкладку</span>
        </template>
        <template v-else>
          <span
            class="size-2 shrink-0 rounded-full bg-ok lg:hidden"
            aria-hidden="true"
          />
          <UIcon
            name="i-lucide-check"
            class="hidden size-4 shrink-0 text-ok lg:block"
          />
          <span>Работает офлайн, всё хранится в этом браузере</span>
        </template>
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
          v-if="!data.settings.modelId && data.settings.provider !== 'custom'"
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
      <section aria-labelledby="s-data">
        <h2
          id="s-data"
          class="px-5 pt-5 pb-1 text-cap text-toned lg:px-0 lg:pt-7.5 lg:pb-0.5"
        >
          Данные
        </h2>
        <SettingRow
          label="Экспорт"
          icon="i-lucide-download"
          desk-hint="JSON для переноса, Markdown чтобы читать"
          value="JSON или Markdown"
          opens
          @open="exporting = true"
        >
          <div class="flex gap-2">
            <UButton @click="exportJson">
              JSON
            </UButton>
            <UButton @click="exportMarkdown">
              Markdown
            </UButton>
          </div>
        </SettingRow>
        <SettingRow
          label="Импорт"
          icon="i-lucide-upload"
          hint="Из файла экспорта JSON"
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
          :value="trashCount ? `${trashCount}` : 'пусто'"
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
          v-if="persisted !== null && !data.storageError"
          label="Не удалять при нехватке места"
          icon="i-lucide-shield-check"
          :hint="persisted ? 'Браузер не удалит данные сам' : 'Без этого браузер может очистить данные сам'"
          :value="persisted ? undefined : 'Включить'"
          :opens="!persisted"
          @open="persist"
        >
          <p
            v-if="persisted"
            class="flex items-center gap-1.5 text-13 text-ok"
          >
            <UIcon
              name="i-lucide-check"
              class="size-3.5"
            />Включено
          </p>
          <UButton
            v-else
            @click="persist"
          >
            Включить
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
      v-model:open="exporting"
      :items="exportItems"
      title="Экспорт"
      label="Экспорт"
      bare
    />
  </AppScreen>
</template>
