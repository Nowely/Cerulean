<script setup lang="ts">
// The composer's field as a minimal editor (v24, item 12): the words and the names picked after «@», each the body's mention
// chip. Loaded after the first paint by ComposerField, which draws a plain field until then. Its words go up as text, a chip
// read «@Name», and what the chips point at as `links`; text set from outside («Отменить», a dictation) comes back in with
// each linked «@Name» as its chip. The «@» row itself is drawn by the composer (MentionRow), fed from here.
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion'
import type { BodyDoc, Id } from '~/domain/types'
import { mentionIds, mentionOptions, type MentionTarget } from '~/domain/body'
import { fieldDoc, fieldText, type FieldMention } from '~/domain/mention'
import { useDataStore } from '~/stores/data'
import { composerExtensions } from '../body/extensions'

const props = defineProps<{
  label: string
  placeholder: string
  /** Whether «@» opens the row (not with «Подпункт»: a subitem is one line with no links) */
  mentions: boolean
  /** A record's composer leaves the record itself out of the row */
  ownerId?: Id
  fieldClass: string
}>()
const text = defineModel<string>({ required: true })
const links = defineModel<Id[]>('links', { required: true })
const emit = defineEmits<{ enter: [], focus: [boolean], multi: [boolean] }>()
const data = useDataStore()

// ---------- what «@» offers: names that start with the query, then names with a word that does; pages opened lately ----------

const targets = computed(() => ({
  records: data.liveRecords
    .filter(r => !r.parentId && r.id !== props.ownerId)
    .map(r => ({ id: r.id, kind: 'record' as const, name: r.text, done: r.done, pageId: r.pageId })),
  pages: data.livePages
    .filter(p => p.kind === 'page' && p.title.trim() && p.id !== props.ownerId)
    .map(p => ({ id: p.id, kind: 'page' as const, name: p.title, openedAt: p.openedAt }))
}))

const rank = (query: string) => mentionOptions({ query, context: '', ...targets.value, linked: [] })

// ---------- the «@» row's state ----------

const mention = ref<FieldMention | null>(null)
let suggestion: SuggestionProps<MentionTarget> | null = null

function onMention(p: SuggestionProps<MentionTarget> | null) {
  suggestion = p
  const was = mention.value
  mention.value = p ? { query: p.query, items: p.items, hi: was && was.query === p.query ? Math.min(was.hi, Math.max(0, p.items.length - 1)) : 0 } : null
}

/** ↑/↓ move the mark and wrap; Esc is the suggestion's own: the row closes and the «@» stays typed */
function onMentionKey({ event }: SuggestionKeyDownProps): boolean {
  const m = mention.value
  if (!m || !m.items.length || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return false
  const n = m.items.length
  mention.value = { ...m, hi: (m.hi + (event.key === 'ArrowDown' ? 1 : n - 1)) % n }
  return true
}

/** A pick puts the name as a chip in place of «@» and the query; the field goes on after it */
function pick(t: { id: Id, name: string }) {
  const ed = editor.value
  if (!ed) return
  if (suggestion) {
    suggestion.command({ id: t.id, label: t.name })
    return
  }
  // From «Ещё…», after the row closed: the «@» and the query typed before the caret make way for the chip
  const { $from } = ed.state.selection
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼')
  const at = before.search(/@[^\s@]*$/)
  const from = at >= 0 ? $from.pos - (before.length - at) : $from.pos
  ed.chain().focus().insertContentAt({ from, to: $from.pos }, [
    { type: 'mention', attrs: { id: t.id, label: t.name, mentionSuggestionChar: '@' } },
    { type: 'text', text: ' ' }
  ]).run()
}

// ---------- the field ----------

const named = (ids: Id[]) => ids.map(id => ({ id, name: data.nameOf(id) })).filter(l => l.name)
/** What this field last said its words were: anything else in the model was set from outside */
let said = text.value

const editor = useEditor({
  content: fieldDoc(text.value, named(links.value)),
  extensions: composerExtensions({
    nameOf: (id, label) => data.nameOf(id, label),
    mentionItems: query => rank(query),
    onMention,
    onMentionKey,
    allow: () => props.mentions,
    onEnter: () => {
      const m = mention.value
      if (m?.items.length) {
        pick(m.items[m.hi] ?? m.items[0]!)
        return true
      }
      emit('enter')
      return true
    }
  }),
  injectCSS: false,
  enableInputRules: false,
  enablePasteRules: false,
  editorProps: {
    attributes: {
      'class': `field-text no-scrollbar max-h-32 min-w-0 overflow-y-auto text-input leading-5.5 text-highlighted ${props.fieldClass}`,
      'role': 'textbox',
      'aria-label': props.label,
      'aria-multiline': 'true',
      'aria-placeholder': props.placeholder,
      'enterkeyhint': 'send',
      'autocapitalize': 'sentences',
      'autocomplete': 'off'
    }
  },
  onUpdate: ({ editor: ed }) => {
    const doc = ed.getJSON() as BodyDoc
    said = fieldText(doc, data.nameOf)
    text.value = said
    const ids = mentionIds(doc)
    if (ids.join() !== links.value.join()) links.value = ids
    measure()
  },
  onFocus: () => emit('focus', true),
  onBlur: () => emit('focus', false)
})

// Words set from outside, and those typed in the plain field while the editor was being made
watch([text, links, editor], ([t, ids]) => {
  const ed = editor.value
  if (!ed || t === said) return
  said = t
  ed.commands.setContent(fieldDoc(t, named(ids)), { emitUpdate: false })
  measure()
})
watch(() => [props.label, props.placeholder], () => {
  const dom = editor.value?.view.dom
  dom?.setAttribute('aria-label', props.label)
  dom?.setAttribute('aria-placeholder', props.placeholder)
})

/** More than one line: the pill's corners follow (radius 20 instead of 22) */
const lines = shallowRef(false)
function measure() {
  const dom = editor.value?.view.dom
  if (!dom) return
  const css = getComputedStyle(dom)
  const line = parseFloat(css.lineHeight) || 22
  const multi = dom.scrollHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom) > line * 1.5
  if (multi !== lines.value) emit('multi', lines.value = multi)
}

onBeforeUnmount(() => editor.value?.destroy())

defineExpose({
  mention,
  pick,
  // Tiptap focuses a frame later; the view takes the focus now, so no key falls between (and iOS keeps the keyboard)
  focus: () => {
    editor.value?.commands.focus('end')
    editor.value?.view.focus()
  },
  blur: () => editor.value?.commands.blur(),
  el: () => editor.value?.view.dom as HTMLElement | undefined
})
</script>

<template>
  <EditorContent
    :editor="editor"
    class="min-w-0"
  />
</template>
