<script setup lang="ts">
// The editing bar (v23, A3, S1, F2, F7, M1): it takes the composer's slot while a body has focus, the same 44px pill
// (`elev`, 1px `line`, `line2` in dark) at the same width. Faces: the caret (↶ · Заголовок · Список · Нумерованный ·
// Цитата · @ · Готово), a selection (↶ · Ж · К · Ссылка · @ · ○ · Готово; the ring makes a subitem on a record and a
// record on a page note), «@» (up to three whole chips and «Ещё…», which opens «Связать» to mention) and the address
// field of «Ссылка». Its buttons never take the focus from the text. Desktop: 36px round tools, 18px glyphs, tooltips
// that name the keys.
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import type { Hit } from '~/domain/search'
import type { MentionTarget } from '~/domain/body'
import { GLYPHS } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useScreen } from '~/composables/useScreen'
import { useBodyEditing, type BodyKind } from '~/composables/useBodyEditing'
import LinkPicker from '../record/LinkPicker.vue'
import BarTip from './BarTip'

const data = useDataStore()
const body = useBodyEditing()
const { isDesktop } = useScreen()
const bar = useTemplateRef<HTMLElement>('bar')
const url = useTemplateRef<HTMLInputElement>('url')
watch(bar, (el) => {
  body.barEl.value = el
}, { immediate: true })

const s = computed(() => body.session.value)
const act = computed(() => s.value?.actions)
const st = computed(() => body.state.value)
const face = computed(() => body.face.value)

const KINDS: { kind: BodyKind, label: string, icon: string, keys: string }[] = [
  { kind: 'heading', label: 'Заголовок', icon: 'i-cer-body-heading', keys: '# пробел' },
  { kind: 'bullet', label: 'Список', icon: 'i-cer-body-list', keys: '- пробел' },
  { kind: 'ordered', label: 'Нумерованный список', icon: 'i-cer-body-numbered', keys: '1. пробел' },
  { kind: 'quote', label: 'Цитата', icon: 'i-cer-body-quote', keys: '> пробел' }
]

/** The bar's buttons never take the focus from the text; the address field does */
function keep(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('input')) return
  e.preventDefault()
}

// «Ссылка»: the field takes the keys
const href = ref('')
watch(() => body.linking.value, async (l) => {
  if (!l) return
  href.value = l.href
  await nextTick()
  url.value?.focus()
})
function applyLink() {
  act.value?.applyLink(href.value)
}

// «@»: the chips, and «Ещё…»
const chips = computed(() => body.mention.value?.items ?? [])
const glyphOf = (t: MentionTarget) => {
  const page = t.kind === 'page' ? data.pages[t.id] : data.pages[t.pageId ?? '']
  return GLYPHS[page?.glyph ?? 'doc']
}
const owner = computed(() => s.value?.owner)
const ownerRec = computed(() => owner.value?.kind === 'record' ? data.records[owner.value.id] : undefined)
function more(h: Hit) {
  const t: MentionTarget = h.kind === 'page'
    ? { id: h.page.id, kind: 'page', name: h.page.title }
    : { id: h.rec.id, kind: 'record', name: h.rec.text, pageId: h.rec.pageId }
  act.value?.pickMention(t)
}
</script>

<template>
  <div
    ref="bar"
    role="toolbar"
    aria-label="Текст"
    class="flex min-h-11 items-center rounded-pill border border-default bg-default px-px dark:border-line2 lg:gap-0.5 lg:p-0.75"
    data-body-keep
    @mousedown="keep"
  >
    <!-- The «@» face: whole chips only, as many as fit (one to three), «Ещё…» always whole at the right -->
    <template v-if="face === 'mention'">
      <div
        class="flex h-10.5 min-w-0 flex-1 flex-wrap content-start items-center gap-x-1.5 gap-y-2 overflow-hidden pt-1 pr-1 pl-0.75 lg:h-9 lg:pt-0.75 lg:pr-0"
        role="group"
        aria-label="Упомянуть"
      >
        <button
          v-for="(t, i) in chips"
          :key="t.id"
          type="button"
          class="flex h-8.5 max-w-34 min-w-0 cursor-pointer items-center gap-1.5 rounded-chip pr-2.5 pl-2 text-sm text-highlighted active:bg-chip-elev-pressed lg:h-7.5 lg:max-w-55 lg:hover:bg-chip-elev-pressed"
          :class="isDesktop && body.mention.value?.hi === i ? 'bg-chip-elev-pressed' : 'bg-chip-elev'"
          :aria-label="`Упомянуть «${t.name}»`"
          @click="act?.pickMention(t)"
        >
          <UIcon
            :name="glyphOf(t)"
            class="size-3 shrink-0 text-toned"
          />
          <span class="min-w-0 truncate">{{ t.name }}</span>
        </button>
      </div>
      <LinkPicker
        v-model:open="body.moreOpen.value"
        :rec="ownerRec"
        :owner-id="owner?.id"
        :query="body.mention.value?.query ?? ''"
        mention
        @pick="more"
        @closed="act?.refocus()"
      >
        <button
          type="button"
          class="h-10.5 shrink-0 cursor-pointer whitespace-nowrap rounded-xl pr-3 pl-2 text-15 font-medium text-accent-ink active:bg-pressed lg:h-9 lg:rounded-full lg:px-3.5 lg:hover:bg-accent-soft"
          aria-haspopup="dialog"
        >
          Ещё…
        </button>
      </LinkPicker>
    </template>

    <!-- «Ссылка»: one field, applied by Enter or «Готово» -->
    <template v-else-if="face === 'link'">
      <input
        ref="url"
        v-model="href"
        type="url"
        inputmode="url"
        autocomplete="off"
        placeholder="Адрес ссылки"
        aria-label="Адрес ссылки"
        class="h-10 min-w-0 flex-1 bg-transparent pl-3.5 text-base text-highlighted outline-none placeholder:text-dimmed lg:h-9 lg:pl-3"
        @keydown.enter.prevent="applyLink"
        @keydown.esc.prevent="act?.cancelLink()"
      >
    </template>

    <template v-else>
      <BarTip
        label="Отменить"
        keys="Ctrl Z"
      >
        <button
          type="button"
          class="ebt"
          :class="st.canUndo ? '' : 'ebt-off'"
          aria-label="Отменить ввод"
          :aria-disabled="!st.canUndo"
          @click="st.canUndo && act?.undo()"
        >
          <UIcon
            name="i-cer-body-undo"
            class="ebg"
          />
        </button>
      </BarTip>

      <!-- The caret: the kind of its line is pressed, a second tap makes it a paragraph again -->
      <template v-if="face === 'caret'">
        <BarTip
          v-for="k in KINDS"
          :key="k.kind"
          :label="k.label"
          :keys="k.keys"
        >
          <button
            type="button"
            class="ebt"
            :class="st.kind === k.kind ? 'ebt-on' : ''"
            :aria-label="k.label"
            :aria-pressed="st.kind === k.kind"
            @click="act?.toggle(k.kind)"
          >
            <!-- The heading is the letter «H» (main flow, item 14): the glyph read as a menu -->
            <span
              v-if="k.kind === 'heading'"
              class="text-15 leading-none font-bold"
              aria-hidden="true"
            >H</span>
            <UIcon
              v-else
              :name="k.icon"
              class="ebg"
            />
          </button>
        </BarTip>
      </template>

      <!-- A selection: bold, italic, a link -->
      <template v-else>
        <BarTip
          label="Жирный"
          keys="Ctrl B"
        >
          <button
            type="button"
            class="ebt ebl font-semibold"
            :class="st.bold ? 'ebt-on' : ''"
            aria-label="Жирный"
            :aria-pressed="st.bold"
            @click="act?.mark('bold')"
          >
            <span aria-hidden="true">Ж</span>
          </button>
        </BarTip>
        <BarTip
          label="Курсив"
          keys="Ctrl I"
        >
          <button
            type="button"
            class="ebt ebl"
            :class="st.italic ? 'ebt-on' : ''"
            aria-label="Курсив"
            :aria-pressed="st.italic"
            @click="act?.mark('italic')"
          >
            <span
              aria-hidden="true"
              class="[font-style:oblique]"
            >К</span>
          </button>
        </BarTip>
        <BarTip
          label="Ссылка"
          keys="Ctrl K"
        >
          <button
            type="button"
            class="ebt"
            aria-label="Ссылка"
            @click="act?.link()"
          >
            <UIcon
              name="i-cer-body-link"
              class="ebg"
            />
          </button>
        </BarTip>
      </template>

      <BarTip
        label="Упомянуть"
        keys="@"
      >
        <button
          type="button"
          class="ebt"
          aria-label="Упомянуть"
          @click="act?.mention()"
        >
          <UIcon
            name="i-cer-body-at"
            class="ebg"
          />
        </button>
      </BarTip>

      <!-- The product's empty checkbox ring: «Сделать подпунктом» on a record, «Сделать записью» on a page note (v24) -->
      <BarTip
        v-if="face === 'select' && s?.canSub"
        :label="s.subLabel"
      >
        <button
          type="button"
          class="ebt"
          :aria-label="s.subLabel"
          @click="act?.toSub()"
        >
          <span
            class="size-5 rounded-full border-[1.5px] border-ring lg:size-4.5"
            aria-hidden="true"
          />
        </button>
      </BarTip>
    </template>

    <template v-if="face !== 'mention'">
      <span class="flex-1" />
      <BarTip
        label="Esc"
      >
        <button
          type="button"
          class="h-10.5 shrink-0 cursor-pointer whitespace-nowrap rounded-xl pr-3 pl-2 text-15 font-medium text-accent-ink active:bg-pressed lg:h-9 lg:rounded-full lg:px-3.5 lg:hover:bg-accent-soft"
          @click="face === 'link' ? applyLink() : act?.done()"
        >
          Готово
        </button>
      </BarTip>
    </template>
  </div>
</template>

<style scoped>
.ebt {
  display: flex;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 42px;
  border-radius: 12px;
  color: var(--muted);
  cursor: pointer;
}

.ebt:active {
  background: var(--pressed);
}

.ebt-on,
.ebt-on:active {
  background: var(--accent-soft);
  color: var(--accent-ink);
}

.ebt-off,
.ebt-off:active {
  background: transparent;
  color: var(--faint);
  cursor: default;
}

.ebg {
  width: 20px;
  height: 20px;
}

/* Ж and К are letters standing for themselves, in ink */
.ebl {
  font-size: 18px;
}

.ebl:not(.ebt-on) {
  color: var(--ink);
}

@media (width >= 64rem) {
  .ebt {
    flex-basis: 36px;
    width: 36px;
    height: 36px;
    border-radius: 18px;
  }

  .ebt:hover {
    background: var(--hover);
    color: var(--ink);
  }

  .ebt-on,
  .ebt-on:hover {
    background: var(--accent-soft);
    color: var(--accent-ink);
  }

  .ebt-off:hover {
    background: transparent;
    color: var(--faint);
  }

  .ebg {
    width: 18px;
    height: 18px;
  }

  .ebl {
    font-size: 17px;
  }
}
</style>
