<script setup lang="ts">
// The editor of one body (v23), Tiptap with only what item 3 allows. Loaded on first use by BodyField. At rest it looks
// exactly like the text (BodyView draws it until the editor is ready); focused, the editing bar takes the composer's slot
// of its surface (useBodyEditing) and drives it through `actions`. Every change saves, debounced; leaving the text saves
// at once. Mentions feed «Связано» through the store.
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import type { Editor, Range } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import { exitSuggestion, type SuggestionProps } from '@tiptap/suggestion'
import type { BodyDoc } from '~/domain/types'
import { closeUp, isEmptyDoc, mentionOptions, subText, type BodyOwner, type MentionTarget } from '~/domain/body'
import { useDataStore } from '~/stores/data'
import { useFind } from '~/composables/useFind'
import { useNotify } from '~/composables/useNotify'
import { useScreen } from '~/composables/useScreen'
import { BODY_SURFACE, useBodyEditing, type BodyActions, type BodyKind, type BodySession, type SlashItem } from '~/composables/useBodyEditing'
import { bodyExtensions, INPUT_RULES, MENTION_KEY, SLASH_KEY } from './extensions'
import { settleEdges } from './settle'
import BodyView from './BodyView'

const props = defineProps<{
  owner: BodyOwner
  doc: BodyDoc | null
  placeholder: string
  /** What the «@» face ranks by besides the line: the record's or the page's name */
  context: string
  label: string
  /** Take the focus as soon as the editor is ready */
  autofocus?: 'start' | 'end' | null
}>()
const emit = defineEmits<{ focus: [boolean] }>()

const surface = inject(BODY_SURFACE, 'main')
const data = useDataStore()
const find = useFind()
const notify = useNotify()
const { isDesktop } = useScreen()
const body = useBodyEditing()

// ---------- what to mention ----------

const targets = computed(() => ({
  records: data.liveRecords
    .filter(r => !r.parentId && r.id !== props.owner.id)
    .map(r => ({ id: r.id, kind: 'record' as const, name: r.text, done: r.done, pageId: r.pageId })),
  pages: data.livePages
    .filter(p => p.kind === 'page' && p.title.trim() && p.id !== props.owner.id)
    .map(p => ({ id: p.id, kind: 'page' as const, name: p.title, openedAt: p.openedAt }))
}))

function rank(query: string): MentionTarget[] {
  const ed = editor.value
  const line = ed ? ed.state.selection.$from.parent.textContent : ''
  const linked = props.owner.kind === 'record' ? data.linksOf(props.owner.id).map(h => h.kind === 'page' ? h.page.id : h.rec.id) : []
  return mentionOptions({ query, context: `${props.context} ${line}`, ...targets.value, linked })
}

// ---------- saving ----------

/** What the store holds as far as this editor knows: a change from elsewhere (undo, another tab) is anything else */
let stored = JSON.stringify(props.doc ?? null)
let pending = false
let timer: ReturnType<typeof setTimeout> | undefined

function scheduleSave() {
  pending = true
  clearTimeout(timer)
  timer = setTimeout(flush, 400)
}

function flush() {
  clearTimeout(timer)
  timer = undefined
  if (!pending) return
  pending = false
  const ed = editor.value
  if (!ed || ed.isDestroyed) return
  const json = ed.getJSON() as BodyDoc
  const next = isEmptyDoc(json) ? null : json
  const text = JSON.stringify(next)
  if (text === stored) return
  stored = text
  data.setBody(props.owner, next)
}

watch(() => props.doc, (doc) => {
  const text = JSON.stringify(doc ?? null)
  if (text === stored || pending) return
  stored = text
  const ed = editor.value
  if (!ed || ed.isDestroyed) return
  const { from, to } = ed.state.selection
  ed.commands.setContent(doc ?? '', { emitUpdate: false })
  if (ed.isFocused) {
    const end = ed.state.doc.content.size
    ed.commands.setTextSelection({ from: Math.min(from, end), to: Math.min(to, end) })
  }
})

// ---------- the editor ----------

let mentionProps: SuggestionProps<MentionTarget> | null = null
let slashProps: SuggestionProps<SlashItem> | null = null
/** The selection face's «@»: the selected words are the query, and the chip takes their place */
let seeded: Range | null = null
let linkRange: Range | null = null
const ready = ref(false)

const mine = () => body.session.value === session

const editor = useEditor({
  content: props.doc ?? '',
  extensions: bodyExtensions({
    placeholder: props.placeholder,
    nameOf: (id, label) => data.nameOf(id, label),
    mentionItems: query => rank(query),
    onMention: (p) => {
      mentionProps = p
      if (mine()) body.mention.value = p ? { query: p.query, items: p.items, hi: 0 } : seeded ? body.mention.value : null
    },
    onMentionKey: ({ event }) => {
      const m = body.mention.value
      if (!m || !isDesktop.value) return false
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const n = m.items.length
        if (n) body.mention.value = { ...m, hi: (m.hi + (event.key === 'ArrowDown' ? 1 : n - 1)) % n }
        return true
      }
      if (event.key === 'Enter' && m.items[m.hi]) {
        pickMention(m.items[m.hi]!)
        return true
      }
      return false
    },
    slash: () => isDesktop.value,
    onSlash: (p) => {
      slashProps = p
      if (!mine()) return
      const rect = p?.clientRect?.()
      const was = body.slash.value
      body.slash.value = p && p.items.length && rect
        ? { items: p.items, hi: was && was.items.length === p.items.length ? was.hi : 0, rect: { left: rect.left, top: rect.top, bottom: rect.bottom } }
        : null
    },
    onSlashKey: ({ event }) => {
      const m = body.slash.value
      if (!m) return false
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const n = m.items.length
        body.slash.value = { ...m, hi: (m.hi + (event.key === 'ArrowDown' ? 1 : n - 1)) % n }
        return true
      }
      if (event.key === 'Enter') {
        pickSlash(m.items[m.hi]!)
        return true
      }
      return false
    },
    pickSlash: (ed, range, item) => {
      ed.chain().focus().deleteRange(range).run()
      applyKind(item.kind)
    },
    onEscape: () => {
      if (mentionProps || slashProps) return false
      if (seeded) {
        clearSeeded()
        return true
      }
      done()
      return true
    },
    onModK: () => {
      const ed = editor.value
      if (!ed) return false
      // Nothing selected: «Найти», whose field takes the focus and so ends the editing. The text keeps the focus until
      // then, which keeps the shell's own Ctrl K (a toggle) out of this key press
      if (!ed.state.selection.empty) link()
      else find.open()
      return true
    }
  }),
  // body.css carries what ProseMirror needs; Tiptap's own CSS would wrap lines differently from the text at rest
  injectCSS: false,
  enableInputRules: INPUT_RULES,
  enablePasteRules: ['link'],
  editorProps: {
    attributes: { 'class': 'body-text', 'aria-label': props.label, 'aria-multiline': 'true', 'role': 'textbox' },
    // The caret's line and one line of context above it stay in view
    scrollMargin: { top: 32, bottom: 12, left: 0, right: 0 },
    scrollThreshold: { top: 32, bottom: 12, left: 0, right: 0 }
  },
  onCreate: ({ editor: ed }) => {
    session.root = ed.view.dom
    ready.value = true
    if (props.autofocus) void nextTick(() => ed.commands.focus(props.autofocus!))
  },
  onFocus: () => onFocus(),
  onBlur: () => onBlur(),
  onUpdate: () => scheduleSave(),
  onTransaction: () => onTransaction()
})

// ---------- the bar ----------

function kindAt(ed: Editor): BodyKind | null {
  const $from = ed.state.selection.$from
  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name
    if (name === 'heading') return 'heading'
    if (name === 'bulletList') return 'bullet'
    if (name === 'orderedList') return 'ordered'
    if (name === 'blockquote') return 'quote'
  }
  return null
}

function refresh() {
  const ed = editor.value
  if (!ed || !mine()) return
  const sel = ed.state.selection
  body.state.value = {
    canUndo: ed.can().undo(),
    selected: !sel.empty && sel instanceof TextSelection,
    kind: kindAt(ed),
    bold: ed.isActive('bold'),
    italic: ed.isActive('italic')
  }
}

function applyKind(kind: BodyKind | 'mention') {
  const ed = editor.value
  if (!ed) return
  const chain = ed.chain().focus()
  if (kind === 'heading') chain.toggleHeading({ level: 2 }).run()
  else if (kind === 'bullet') chain.toggleBulletList().run()
  else if (kind === 'ordered') chain.toggleOrderedList().run()
  else if (kind === 'quote') chain.toggleBlockquote().run()
  else startMention()
}

function pickSlash(item: SlashItem) {
  const ed = editor.value
  const range = slashProps?.range
  if (!ed || !range) return
  exitSuggestion(ed.view, SLASH_KEY)
  ed.chain().focus().deleteRange(range).run()
  applyKind(item.kind)
}

function clearSeeded() {
  seeded = null
  if (!mentionProps && mine()) body.mention.value = null
}

/** The caret face types «@» (after a space); the selection face makes the selected words the query */
function startMention() {
  const ed = editor.value
  if (!ed) return
  const { from, to, empty, $from } = ed.state.selection
  if (!empty) {
    seeded = { from, to }
    const query = ed.state.doc.textBetween(from, to, ' ')
    body.mention.value = { query, items: rank(query), hi: 0 }
    return
  }
  const before = $from.parentOffset ? ed.state.doc.textBetween(from - 1, from, '', '\uFFFC') : ' '
  ed.chain().focus().insertContent(/\s/.test(before) ? '@' : ' @').run()
}

function pickMention(t: MentionTarget) {
  const ed = editor.value
  if (!ed) return
  const attrs = { id: t.id, label: t.name }
  if (mentionProps) {
    mentionProps.command(attrs)
    return
  }
  const at = seeded ?? { from: ed.state.selection.from, to: ed.state.selection.to }
  clearSeeded()
  ed.chain().focus().insertContentAt(at, [{ type: 'mention', attrs: { ...attrs, mentionSuggestionChar: '@' } }, { type: 'text', text: ' ' }]).run()
}

function link() {
  const ed = editor.value
  if (!ed) return
  const { from, to } = ed.state.selection
  linkRange = { from, to }
  body.linking.value = { href: String(ed.getAttributes('link').href ?? '') }
}

function applyLink(href: string) {
  const ed = editor.value
  const range = linkRange
  linkRange = null
  body.linking.value = null
  if (!ed || !range) return
  const url = href.trim()
  const chain = ed.chain().focus().setTextSelection(range).extendMarkRange('link')
  if (!url) chain.unsetLink().run()
  else chain.setLink({ href: /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}` }).run()
}

function cancelLink() {
  const range = linkRange
  linkRange = null
  body.linking.value = null
  const chain = editor.value?.chain().focus()
  if (range) chain?.setTextSelection(range)
  chain?.run()
}

/**
 * «Сделать подпунктом» (v23, A6, S1): the selected words leave the line and become the record's last subitem; the line
 * closes up (a whole sentence takes its full stop, no space before punctuation, a line left empty goes) and the caret
 * stays where the words were. The toast takes it all back
 */
function toSub() {
  const ed = editor.value
  const rec = props.owner.kind === 'record' ? data.records[props.owner.id] : undefined
  if (!ed || !rec) return
  const { state } = ed
  const sel = state.selection
  const $from = sel.$from
  if (sel.empty || !$from.parent.isTextblock) return
  const start = $from.start()
  const end = $from.end()
  const from = sel.from
  const to = Math.min(sel.to, end)
  const words = state.doc.textBetween(from, to, ' ', n => n.type.name === 'mention' ? data.nameOf(String(n.attrs.id), n.attrs.label) : '')
  const text = subText(words)
  if (!text) return
  const leaf = () => '￼'
  const c = closeUp(state.doc.textBetween(start, from, '', leaf), state.doc.textBetween(to, end, '', leaf))
  pending = true
  flush()
  const before = ed.getJSON() as BodyDoc
  const tr = state.tr
  const a = from - c.cutBefore
  if (c.join) tr.insertText(c.join, a, to + c.cutAfter)
  else tr.delete(a, to + c.cutAfter)
  let caret = a + c.join.length
  if (c.capital) {
    const ch = tr.doc.textBetween(caret, caret + 1)
    if (ch && ch !== ch.toUpperCase()) tr.insertText(ch.toUpperCase(), caret, caret + 1)
  }
  // A line left empty goes, with the list item or quote that held only it
  const $a = tr.doc.resolve(Math.min(caret, tr.doc.content.size))
  if ($a.parent.isTextblock && !$a.parent.content.size) {
    let d = $a.depth
    while (d > 1 && $a.node(d - 1).childCount === 1) d--
    if (d > 1 || tr.doc.childCount > 1) {
      const at = $a.before(d)
      tr.delete(at, $a.after(d))
      caret = Math.max(0, at - 1)
    }
  }
  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(caret, tr.doc.content.size))))
  ed.view.dispatch(tr)
  pending = true
  flush()
  const sub = data.addRecord({ pageId: rec.pageId, parentId: rec.id, text })
  // The new row scrolls into view as it mounts; the edges settle after that
  void nextTick(settleSoon)
  const owner = { ...props.owner }
  notify('Строка стала подпунктом', {
    label: 'Отменить',
    run: () => {
      data.purgeRecords([sub.id])
      data.setBody(owner, before)
    }
  })
}

const actions: BodyActions = {
  done: () => done(),
  undo: () => editor.value?.chain().focus().undo().run(),
  toggle: kind => applyKind(kind),
  mark: m => editor.value?.chain().focus()[m === 'bold' ? 'toggleBold' : 'toggleItalic']().run(),
  mention: () => startMention(),
  pickMention: t => pickMention(t),
  link: () => link(),
  applyLink: href => applyLink(href),
  cancelLink: () => cancelLink(),
  toSub: () => toSub(),
  pickSlash: item => pickSlash(item),
  refocus: () => {
    if (mine()) editor.value?.commands.focus()
  }
}

const session: BodySession = {
  owner: { ...props.owner },
  surface,
  root: null as unknown as HTMLElement,
  canSub: props.owner.kind === 'record',
  actions
}

// ---------- focus: the session starts with the caret and ends with «Готово», Esc or a tap outside ----------

function onFocus() {
  if (!mine()) {
    body.begin(session)
    document.addEventListener('pointerdown', outside, true)
    window.visualViewport?.addEventListener('resize', settleSoon)
    watchScroller()
  }
  emit('focus', true)
  refresh()
  settleSoon()
}

function onBlur() {
  flush()
  setTimeout(() => {
    if (!mine() || editor.value?.isFocused) return
    if (body.keeps(document.activeElement)) return
    finish()
  }, 0)
}

function outside(e: PointerEvent) {
  if (!mine() || body.keeps(e.target as Element)) return
  editor.value?.commands.blur()
  finish()
}

function finish() {
  pending = true
  flush()
  seeded = null
  linkRange = null
  document.removeEventListener('pointerdown', outside, true)
  window.visualViewport?.removeEventListener('resize', settleSoon)
  sized?.disconnect()
  sized = null
  if (mine()) body.end(session)
  emit('focus', false)
}

/** «Готово»: leaves the text, which is the save, and brings the composer back */
function done() {
  const ed = editor.value
  if (ed && mentionProps) exitSuggestion(ed.view, MENTION_KEY)
  ed?.commands.blur()
  window.getSelection()?.removeAllRanges()
  finish()
}

let caretTop = 0
function onTransaction() {
  const ed = editor.value
  if (!ed || !mine()) return
  const sel = ed.state.selection
  if (seeded && (sel.from !== seeded.from || sel.to !== seeded.to)) clearSeeded()
  refresh()
  if (!isDesktop.value) {
    const top = ed.view.coordsAtPos(sel.head).top
    if (Math.abs(top - caretTop) > 12) settleSoon()
  }
}

/** Phone, keyboard up: the caret's line and one above it in view, and neither edge cuts a line or a row */
let settleTimer: ReturnType<typeof setTimeout> | undefined
/** The text's scroll area changes height with the keyboard, the bar's faces and a toast over the bar: settle again */
let sized: ResizeObserver | null = null
function watchScroller() {
  const scroller = editor.value?.view.dom.closest('.overflow-y-auto')
  if (isDesktop.value || !scroller || sized) return
  sized = new ResizeObserver(() => settleSoon())
  sized.observe(scroller)
}
function settleSoon() {
  if (isDesktop.value) return
  clearTimeout(settleTimer)
  settleTimer = setTimeout(() => requestAnimationFrame(settle), 80)
}
function settle() {
  const ed = editor.value
  if (!ed || ed.isDestroyed || !mine() || !ed.isFocused) return
  const scroller = ed.view.dom.closest('.overflow-y-auto') as HTMLElement | null
  if (!scroller) return
  const line = () => {
    const c = ed.view.coordsAtPos(ed.state.selection.head)
    const top = c.top - (24 - (c.bottom - c.top)) / 2
    caretTop = c.top
    return { top: top - 24, bottom: top + 24 }
  }
  const box = scroller.getBoundingClientRect()
  const first = line()
  if (first.bottom > box.bottom) scroller.scrollTop += first.bottom - box.bottom
  else if (first.top < box.top) scroller.scrollTop -= box.top - first.top
  settleEdges(scroller, line())
  caretTop = ed.view.coordsAtPos(ed.state.selection.head).top
}

onBeforeUnmount(() => {
  clearTimeout(settleTimer)
  finish()
})

defineExpose({
  focus: (where: 'start' | 'end' = 'end') => editor.value?.commands.focus(where)
})
</script>

<template>
  <div>
    <BodyView
      v-if="!ready"
      :doc="doc"
      :placeholder="placeholder"
    />
    <EditorContent
      v-show="ready"
      :editor="editor"
    />
    <!-- «/» on desktop: the caret face's tools at the caret, each with its Markdown shortcut -->
    <Teleport
      v-if="body.slash.value && body.session.value === session"
      to="body"
    >
      <div
        class="raised fixed z-50 w-68 rounded-card border border-default bg-default p-1.5 shadow-float"
        :style="{ left: `${body.slash.value.rect.left - 8}px`, top: `${body.slash.value.rect.bottom + 6}px` }"
        role="listbox"
        aria-label="Вставить"
        data-body-keep
        @mousedown.prevent
      >
        <button
          v-for="(item, i) in body.slash.value.items"
          :key="item.kind"
          type="button"
          role="option"
          :aria-selected="i === body.slash.value.hi"
          class="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-item px-2 text-left text-15"
          :class="i === body.slash.value.hi ? 'bg-muted text-highlighted' : 'text-default hover:bg-muted'"
          @click="pickSlash(item)"
        >
          <UIcon
            :name="item.icon"
            class="size-4.5 shrink-0 text-toned"
          />
          <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
          <UKbd :value="item.keys" />
        </button>
      </div>
    </Teleport>
  </div>
</template>
