<script setup lang="ts">
// One-time card on Главная while there is no key: what simple rules can do, and where the key goes
import { useRouter } from '#imports'
import { useDataStore } from '~/stores/data'

const data = useDataStore()
const router = useRouter()
const close = () => data.setSettings({ dismissed: [...data.settings.dismissed, 'key-card'] })
</script>

<template>
  <section
    class="rounded-card border border-default bg-default pt-3.5 pr-1.5 pb-3 pl-3.5"
    aria-labelledby="key-card-title"
  >
    <div class="flex items-start gap-2.5">
      <UIcon
        name="i-lucide-key-round"
        class="mt-0.5 size-4.5 shrink-0 text-toned"
      />
      <h2
        id="key-card-title"
        class="min-w-0 flex-1 text-base font-semibold leading-snug text-highlighted"
      >
        Без ключа работают только простые правила
      </h2>
      <UButton
        icon="i-lucide-x"
        variant="ghost"
        square
        aria-label="Закрыть"
        class="-mt-2.5"
        @click="close"
      />
    </div>
    <p class="mt-1 pr-2 text-sm leading-relaxed text-toned">
      Остальное попадёт во Входящие с меткой «уточнить». С ключом OpenAI записи раскладываются точнее, ключ хранится только в этом браузере.
    </p>
    <UButton
      color="primary"
      variant="solid"
      class="mt-3"
      @click="router.push('/settings?key')"
    >
      Добавить ключ
    </UButton>
  </section>
</template>
