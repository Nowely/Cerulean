<script setup lang="ts">
// «Синхронизация» (sync delta, items 5–12, 14): the sheet of the row in «Данные», the pattern of «Подключение».
// Off: the connect form (labels above fields, «Отмена» / «Подключить», nothing kept until the check passes). On,
// stopped or read-only: one sheet with its state line on top, the bucket, the key ID and the secret masked, and the
// one fix in place of «Синхронизировать сейчас». ?sync in the URL so back closes it and Главная's sign opens it.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from '#imports'
import { useCloudStore, type ConnectFail } from '~/stores/cloud'
import { useNotify } from '~/composables/useNotify'
import { useNow } from '~/composables/useNow'
import { useScreen } from '~/composables/useScreen'
import { YANDEX } from '~/domain/s3'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'

const cloud = useCloudStore()
const notify = useNotify()
const route = useRoute()
const router = useRouter()
const now = useNow()
const { isDesktop } = useScreen()

/** Yandex Object Storage's page on CORS: where the bucket's rule is set */
const CORS_HELP = 'https://yandex.cloud/ru/docs/storage/operations/buckets/cors'

const open = computed({
  get: () => route.query.sync !== undefined,
  set: (v) => {
    if (v) {
      void router.push({ query: { ...route.query, sync: null } })
      return
    }
    if (route.query.sync === undefined) return
    if (window.history.state?.back) router.back()
    else {
      const { sync: _, ...query } = route.query
      void router.replace({ query })
    }
  }
})

const form = ref(false)
const bucket = ref('')
const keyId = ref('')
const secret = ref('')
const shown = ref(false)
const other = ref(false)
const endpoint = ref<string>(YANDEX.endpoint)
const region = ref<string>(YANDEX.region)
const checking = ref(false)
const answer = ref<ConnectFail | null>(null)
/** The form was opened by «Ввести ключ заново»: the caret goes to the secret, not to «Бакет» */
const keyAgain = ref(false)

function fill(kept: { bucket?: string, keyId?: string } = {}) {
  bucket.value = kept.bucket ?? ''
  keyId.value = kept.keyId ?? ''
  secret.value = ''
  shown.value = false
  other.value = false
  endpoint.value = cloud.meta?.endpoint ?? YANDEX.endpoint
  region.value = cloud.meta?.region ?? YANDEX.region
  answer.value = null
}

watch(open, (v) => {
  if (!v) return
  form.value = !cloud.on
  keyAgain.value = false
  if (form.value) fill()
}, { immediate: true })

/** «бакет ID секрет» typed or pasted whole into any field fills all three (item 6) */
function onField(field: 'bucket' | 'keyId' | 'secret', v: string) {
  const parts = v.trim().split(/\s+/)
  if (parts.length === 3) [bucket.value, keyId.value, secret.value] = parts as [string, string, string]
  else ({ bucket, keyId, secret })[field].value = v
  answer.value = null
}
watch([endpoint, region], () => {
  answer.value = null
})

const complete = computed(() => !!(bucket.value.trim() && keyId.value.trim() && secret.value.trim()))
/** The bucket's name keeps its hyphens unbroken in a sentence */
const bucketShown = (name: string) => name.trim().replace(/-/g, '‑')

async function connect() {
  if (!complete.value || checking.value) return
  checking.value = true
  try {
    const r = await cloud.connect({ bucket: bucket.value, keyId: keyId.value, secret: secret.value, endpoint: endpoint.value, region: region.value })
    if (!r.ok) {
      answer.value = r.reason
      return
    }
    open.value = false
    notify(r.text)
  } finally {
    checking.value = false
  }
}

// ---------- connected ----------

const state = computed(() => cloud.state(now.value))
const masked = computed(() => `••••••••${cloud.meta?.secret.slice(-4) ?? ''}`)
const syncing = ref(false)

async function syncNow() {
  syncing.value = true
  try {
    await cloud.now()
  } finally {
    syncing.value = false
  }
  now.value = Date.now()
}

/** A key that stopped working: the bucket and the key ID stay, only the secret is asked again (item 12) */
function rekey() {
  fill({ bucket: cloud.meta?.bucket, keyId: cloud.meta?.keyId })
  keyAgain.value = true
  form.value = true
}

/** A medium action (item 10): at once, and the notice takes it back */
function disconnect() {
  const undo = cloud.disconnect()
  open.value = false
  notify('Синхронизация выключена', { label: 'Отменить', run: undo })
}

defineExpose({ open: () => open.value = true })
</script>

<template>
  <AdaptiveOverlay
    v-model:open="open"
    title="Синхронизация"
    dialog
    windowed
  >
    <form
      v-if="form"
      class="flex flex-col gap-2.5 px-2 pt-1 pb-2"
      novalidate
      data-sync-form
      @submit.prevent="connect"
    >
      <div>
        <label class="block">
          <span class="block pb-1 text-caption text-toned">Бакет</span>
          <UInput
            :model-value="bucket"
            placeholder="cerulean"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :autofocus="!keyAgain"
            size="lg"
            class="w-full"
            :aria-invalid="answer === 'access'"
            :aria-describedby="answer === 'access' ? 'sync-bucket-err' : undefined"
            :ui="{ base: answer === 'access' ? 'ring-warn md:text-input' : 'md:text-input' }"
            data-sync-bucket
            @update:model-value="onField('bucket', String($event))"
          />
        </label>
        <span
          v-if="answer === 'access'"
          id="sync-bucket-err"
          class="mt-1 block text-13 text-warn-ink"
          role="alert"
        >У этого ключа нет доступа к бакету: нужна роль storage.editor</span>
      </div>
      <label class="block">
        <span class="block pb-1 text-caption text-toned">ID ключа</span>
        <UInput
          :model-value="keyId"
          placeholder="YCAJE…"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          class="w-full"
          :aria-invalid="answer === 'key'"
          size="lg"
          :ui="{ base: answer === 'key' ? 'font-mono ring-warn md:text-input' : 'font-mono md:text-input' }"
          data-sync-key-id
          @update:model-value="onField('keyId', String($event))"
        />
      </label>
      <div>
        <label class="block">
          <span class="block pb-1 text-caption text-toned">Секретный ключ</span>
          <UInput
            :model-value="secret"
            :type="shown ? 'text' : 'password'"
            placeholder="YCP…"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            enterkeyhint="done"
            :autofocus="keyAgain"
            size="lg"
            class="w-full"
            :aria-invalid="answer === 'key'"
            :aria-describedby="answer === 'key' ? 'sync-key-err' : undefined"
            :ui="{ base: answer === 'key' ? 'font-mono tracking-wide ring-warn md:text-input' : 'font-mono tracking-wide md:text-input' }"
            data-sync-secret
            @update:model-value="onField('secret', String($event))"
          >
            <template #trailing>
              <UButton
                :icon="shown ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                variant="ghost"
                square
                size="sm"
                :aria-label="shown ? 'Скрыть ключ' : 'Показать ключ'"
                :title="isDesktop ? (shown ? 'Скрыть ключ' : 'Показать ключ') : undefined"
                :aria-pressed="shown"
                @click="shown = !shown"
              />
            </template>
          </UInput>
        </label>
        <span
          v-if="answer === 'key'"
          id="sync-key-err"
          class="mt-1 block text-13 text-warn-ink"
          role="alert"
        >Неверный ключ: ID или секрет не подходят</span>
      </div>
      <button
        v-if="!other"
        type="button"
        class="-mx-1 flex h-11 cursor-pointer items-center self-start rounded-item px-1 text-15 text-accent-ink hover:bg-muted"
        :aria-expanded="false"
        @click="other = true"
      >
        Другой адрес
      </button>
      <template v-else>
        <label class="block">
          <span class="block pb-1 text-caption text-toned">Адрес</span>
          <UInput
            v-model="endpoint"
            inputmode="url"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            size="lg"
            class="w-full"
            :ui="{ base: 'md:text-input' }"
          />
        </label>
        <label class="block">
          <span class="block pb-1 text-caption text-toned">Регион</span>
          <UInput
            v-model="region"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            size="lg"
            class="w-full"
            :ui="{ base: 'md:text-input' }"
          />
        </label>
      </template>
      <!-- A browser cannot tell a missing bucket from a missing CORS rule: one note for both, in place of the hint -->
      <div
        v-if="answer === 'reach'"
        class="rounded-[10px] bg-warn-soft px-3 py-2.5 text-sm leading-normal text-default"
        role="alert"
        data-sync-reach
      >
        <b class="font-semibold text-warn-ink">Браузер не достучался до бакета «{{ bucketShown(bucket) }}».</b>
        Проверьте название и правило CORS в бакете: источники *, методы GET, PUT и HEAD, заголовки *, а среди открытых
        заголовков (Expose headers) ETag.
        <a
          :href="CORS_HELP"
          target="_blank"
          rel="noopener"
          class="text-accent-ink underline underline-offset-2"
        >Как настроить</a>
      </div>
      <p
        v-else-if="answer === 'offline'"
        class="text-13 leading-snug text-warn-ink"
        role="alert"
      >
        Нет сети: подключить получится, когда она появится.
      </p>
      <p
        v-else
        class="text-13 leading-snug text-toned"
      >
        Бакету нужен доступ из браузера (CORS): <a
          :href="CORS_HELP"
          target="_blank"
          rel="noopener"
          class="text-accent-ink underline underline-offset-2"
        >как настроить</a>
      </p>
      <div class="flex items-center justify-end gap-2 pt-1">
        <UButton
          size="lg"
          @click="open = false"
        >
          Отмена
        </UButton>
        <UButton
          type="submit"
          color="primary"
          variant="solid"
          size="lg"
          :class="checking && 'disabled:opacity-100'"
          :loading="checking"
          :disabled="!complete"
        >
          {{ checking ? 'Проверка…' : 'Подключить' }}
        </UButton>
      </div>
    </form>

    <div
      v-else
      class="flex flex-col px-2 pt-1 pb-2"
      data-sync-on
    >
      <div
        v-if="cloud.meta?.newer"
        class="rounded-[10px] bg-warn-soft px-3 py-2.5 text-sm leading-normal text-default"
        role="status"
      >
        <b class="font-semibold text-warn-ink">Бакет записан новой версией Cerulean.</b>
        Эта версия только читает его, правки остаются на устройстве. Обновите приложение.
      </div>
      <p
        v-else
        class="flex items-start gap-2 text-15 leading-5"
        :class="state.warn ? 'text-warn-ink' : 'text-default'"
        role="status"
        data-sync-state
      >
        <span
          v-if="state.warn"
          class="mt-1.5 size-2 shrink-0 rounded-full bg-warn"
          aria-hidden="true"
        />{{ state.text }}
      </p>
      <dl class="mt-3 border-t border-default text-15">
        <div class="flex justify-between gap-3 border-b border-default py-2.75">
          <dt class="text-toned">
            Бакет
          </dt>
          <dd class="min-w-0 truncate text-highlighted">
            {{ cloud.meta?.bucket }}
          </dd>
        </div>
        <div class="flex justify-between gap-3 border-b border-default py-2.75">
          <dt class="text-toned">
            ID ключа
          </dt>
          <dd class="min-w-0 truncate font-mono text-sm text-highlighted">
            {{ cloud.meta?.keyId }}
          </dd>
        </div>
        <div class="flex justify-between gap-3 border-b border-default py-2.75">
          <dt class="text-toned">
            Секретный ключ
          </dt>
          <dd
            class="min-w-0 truncate font-mono text-sm text-highlighted"
            data-sync-masked
          >
            {{ masked }}
          </dd>
        </div>
      </dl>
      <div class="mt-2 flex flex-col">
        <button
          v-if="cloud.meta?.error"
          type="button"
          class="flex h-12 w-full cursor-pointer items-center text-left text-base text-accent-ink active:bg-pressed"
          @click="rekey"
        >
          Ввести ключ заново
        </button>
        <button
          v-else-if="!cloud.meta?.newer"
          type="button"
          class="flex h-12 w-full cursor-pointer items-center gap-2 text-left text-base text-accent-ink active:bg-pressed disabled:cursor-default disabled:opacity-60"
          :disabled="syncing || !cloud.online"
          @click="syncNow"
        >
          Синхронизировать сейчас
        </button>
        <button
          type="button"
          class="flex h-12 w-full cursor-pointer items-center text-left text-base text-warn-ink active:bg-pressed"
          @click="disconnect"
        >
          Отключить
        </button>
      </div>
      <div class="flex justify-end pt-3">
        <UButton
          color="primary"
          variant="solid"
          size="lg"
          @click="open = false"
        >
          Готово
        </UButton>
      </div>
    </div>
  </AdaptiveOverlay>
</template>
