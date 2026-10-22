// What a body's editor is built from (v23, item 3): StarterKit with only paragraph, one heading level, bullets,
// numbered lists, quote, divider, bold, italic, Link (autolink) and undo; Mention whose suggestion feeds the editing
// bar (never a popup); the Markdown shortcuts as input rules; «/» on desktop; the keys the bar names.
// The composer's field (v24, item 12) is a minimal editor of the same Mention: Document, Paragraph, Text and undo, no marks
// and no input rules; its suggestion feeds the «@» row in the dock.
import { Extension, textblockTypeInputRule, type Editor, type Range } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { MentionTarget } from '~/domain/body'
import type { SlashItem } from '~/composables/useBodyEditing'
import MentionNode from './MentionNode.vue'

export const MENTION_KEY = new PluginKey('bodyMention')
export const SLASH_KEY = new PluginKey('bodySlash')
export const COMPOSER_MENTION_KEY = new PluginKey('composerMention')

/** «/»: the caret face's tools, each with its Markdown shortcut */
export const SLASH_ITEMS: SlashItem[] = [
  { kind: 'heading', label: 'Заголовок', keys: '#', icon: 'i-cer-body-heading' },
  { kind: 'bullet', label: 'Список', keys: '-', icon: 'i-cer-body-list' },
  { kind: 'ordered', label: 'Нумерованный список', keys: '1.', icon: 'i-cer-body-numbered' },
  { kind: 'quote', label: 'Цитата', keys: '>', icon: 'i-cer-body-quote' },
  { kind: 'mention', label: 'Упомянуть', keys: '@', icon: 'i-cer-body-at' }
]

export interface BodyHooks {
  placeholder: string
  /** How a mention reads as text (copy, the editor's own text) */
  nameOf: (id: string, label?: string) => string
  mentionItems: (query: string) => MentionTarget[]
  /** The «@» face starts or follows the query; null when it ends */
  onMention: (props: SuggestionProps<MentionTarget> | null) => void
  onMentionKey: (props: SuggestionKeyDownProps) => boolean
  /** Whether «/» opens its tools here (desktop) */
  slash: () => boolean
  onSlash: (props: SuggestionProps<SlashItem> | null) => void
  onSlashKey: (props: SuggestionKeyDownProps) => boolean
  pickSlash: (editor: Editor, range: Range, item: SlashItem) => void
  /** Esc with nothing over the bar: «Готово» */
  onEscape: () => boolean
  /** Ctrl K: the link field with a selection, «Найти» without one */
  onModK: () => boolean
  /** Ctrl Z right after «Сделать записью» or «Сделать подпунктом»: the whole of it, before the editor's own undo */
  onUndo: () => boolean
}

const PUNCT = /^[,.;:!?…)»]$/

type MentionHooks = Pick<BodyHooks, 'nameOf' | 'mentionItems' | 'onMention' | 'onMentionKey'> & {
  /** Whether «@» opens the strip here at all (the composer's «Подпункт» has no links) */
  allow?: () => boolean
}

/** The one Mention both editors use: the chip (its glyph and live name) and a suggestion that feeds a strip, never a popup */
function mentionExtension(key: PluginKey, hooks: MentionHooks) {
  return Mention.extend({
    addNodeView() {
      return VueNodeViewRenderer(MentionNode, { stopEvent: () => true })
    }
  }).configure({
    deleteTriggerWithBackspace: true,
    renderText: ({ node }) => hooks.nameOf(String(node.attrs.id ?? ''), node.attrs.label ?? undefined),
    suggestion: {
      char: '@',
      pluginKey: key,
      allowSpaces: false,
      ...(hooks.allow ? { allow: () => hooks.allow!() } : {}),
      items: ({ query }) => hooks.mentionItems(query),
      render: () => ({
        onStart: p => hooks.onMention(p),
        onUpdate: p => hooks.onMention(p),
        onExit: () => hooks.onMention(null),
        onKeyDown: p => hooks.onMentionKey(p)
      })
    }
  })
}

export interface ComposerHooks extends MentionHooks {
  /** Enter: the «@» row's marked name, or the send */
  onEnter: () => boolean
}

/** Backspace with nothing but spaces between a chip and the caret takes the chip whole (v24, item 12) */
function takeChip(editor: Editor): boolean {
  const { selection, doc } = editor.state
  if (!selection.empty) return false
  const $at = selection.$from
  let chip: { from: number, to: number } | null = null
  $at.parent.forEach((node, offset) => {
    const from = $at.start() + offset
    if (node.type.name === 'mention' && from + node.nodeSize <= $at.pos) chip = { from, to: from + node.nodeSize }
  })
  const found = chip as { from: number, to: number } | null
  if (!found || doc.textBetween(found.to, $at.pos).trim()) return false
  editor.view.dispatch(editor.state.tr.delete(found.from, $at.pos))
  return true
}

/** The composer's field: Document, Paragraph, Text, Mention and undo; Enter sends, Shift+Enter breaks the line */
export function composerExtensions(hooks: ComposerHooks) {
  const Keys = Extension.create({
    name: 'composerKeys',
    // Before the suggestion's own keys, so Enter is decided in one place
    priority: 1000,
    addKeyboardShortcuts() {
      return {
        'Enter': ({ editor }) => editor.view.composing ? false : hooks.onEnter(),
        'Shift-Enter': ({ editor }) => editor.commands.splitBlock(),
        'Backspace': ({ editor }) => takeChip(editor)
      }
    }
  })
  return [
    StarterKit.configure({
      blockquote: false,
      bold: false,
      bulletList: false,
      code: false,
      codeBlock: false,
      dropcursor: false,
      gapcursor: false,
      hardBreak: false,
      heading: false,
      horizontalRule: false,
      italic: false,
      link: false,
      listItem: false,
      listKeymap: false,
      orderedList: false,
      strike: false,
      trailingNode: false,
      underline: false
    }),
    mentionExtension(COMPOSER_MENTION_KEY, hooks),
    Keys
  ]
}

export function bodyExtensions(hooks: BodyHooks) {
  /** «# » makes the one heading (StarterKit's rule for level 2 only takes «## ») */
  const HeadingRule = Extension.create({
    name: 'bodyHeadingRule',
    addInputRules() {
      const type = this.editor.schema.nodes.heading!
      return [textblockTypeInputRule({ find: /^#{1,6}\s$/, type, getAttributes: { level: 2 } })]
    }
  })

  const Keys = Extension.create({
    name: 'bodyKeys',
    // Before the core keymap, so that Backspace at the start of a heading lifts it first
    priority: 1000,
    addKeyboardShortcuts() {
      return {
        'Escape': () => hooks.onEscape(),
        'Mod-k': () => hooks.onModK(),
        'Mod-z': () => hooks.onUndo(),
        'Backspace': ({ editor }) => {
          if (editor.commands.undoInputRule()) return true
          const { selection } = editor.state
          if (!selection.empty || selection.$from.parentOffset !== 0) return false
          if (editor.isActive('heading')) return editor.commands.setParagraph()
          return false
        }
      }
    }
  })

  const Slash = Extension.create({
    name: 'bodySlash',
    addProseMirrorPlugins() {
      return [Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        pluginKey: SLASH_KEY,
        char: '/',
        startOfLine: true,
        allowedPrefixes: null,
        // Only at the start of an empty line, and only on desktop
        allow: ({ state, range }) => {
          if (!hooks.slash()) return false
          const $from = state.doc.resolve(range.from)
          return $from.parent.type.name === 'paragraph' && $from.parent.textContent === state.doc.textBetween(range.from, range.to)
        },
        items: ({ query }) => {
          const q = query.toLowerCase()
          return SLASH_ITEMS.filter(i => !q || i.label.toLowerCase().split(' ').some(w => w.startsWith(q)))
        },
        command: ({ editor, range, props }) => hooks.pickSlash(editor, range, props),
        render: () => ({
          onStart: p => hooks.onSlash(p),
          onUpdate: p => hooks.onSlash(p),
          onExit: () => hooks.onSlash(null),
          onKeyDown: p => hooks.onSlashKey(p)
        })
      })]
    }
  })

  const BodyMention = mentionExtension(MENTION_KEY, hooks)

  /** Punctuation right after a chip sits tight: a «,» typed after the space a pick left takes that space's place */
  const Tight = Extension.create({
    name: 'bodyTight',
    addProseMirrorPlugins() {
      return [new Plugin({
        props: {
          handleTextInput: (view, from, to, text) => {
            if (from !== to || !PUNCT.test(text) || from < 2) return false
            const { state } = view
            if (state.doc.textBetween(from - 1, from) !== ' ') return false
            if (state.doc.resolve(from - 1).nodeBefore?.type.name !== 'mention') return false
            view.dispatch(state.tr.insertText(text, from - 1, from))
            return true
          },
          // Pasted or dropped files (images) are dropped; text is kept
          handlePaste: (_view, event) => {
            const d = event.clipboardData
            return !!d?.files.length && !d.getData('text/plain') && !d.getData('text/html')
          },
          handleDrop: (_view, event) => {
            if (!(event as DragEvent).dataTransfer?.files.length) return false
            event.preventDefault()
            return true
          }
        }
      })]
    }
  })

  return [
    StarterKit.configure({
      code: false,
      codeBlock: false,
      strike: false,
      underline: false,
      hardBreak: false,
      trailingNode: false,
      dropcursor: false,
      gapcursor: false,
      heading: { levels: [2] },
      link: {
        autolink: true,
        openOnClick: false,
        linkOnPaste: true,
        defaultProtocol: 'https',
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow', class: null }
      }
    }),
    Placeholder.configure({ placeholder: hooks.placeholder }),
    HeadingRule,
    Keys,
    Slash,
    BodyMention,
    Tight
  ]
}

/** Input rules only for the Markdown shortcuts of item 3 («**» does nothing special) */
export const INPUT_RULES = ['bulletList', 'orderedList', 'blockquote', 'horizontalRule', 'bodyHeadingRule']
