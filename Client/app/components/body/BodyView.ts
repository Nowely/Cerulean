// A body drawn without the editor: while Tiptap loads, and where a body is only read (Найти's preview, a page's
// preview). The same elements the editor draws (p, h2, ul/ol > li > p, blockquote, hr, span.mention), so the text
// does not move when the editor takes over. A render function: no stray whitespace between blocks.
import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'
import type { BodyDoc, BodyNode, Id } from '~/domain/types'
import MentionChip from './MentionChip.vue'

export default defineComponent({
  name: 'BodyView',
  props: {
    doc: { type: Object as PropType<BodyDoc | null>, default: null },
    /** Shown faint when the body is empty */
    placeholder: { type: String, default: '' }
  },
  emits: { mention: (_id: Id) => true },
  setup(props, { emit }) {
    const text = (n: BodyNode): VNodeChild => {
      let out: VNodeChild = n.text ?? ''
      for (const m of n.marks ?? []) {
        if (m.type === 'bold') out = h('strong', out)
        else if (m.type === 'italic') out = h('em', out)
        else if (m.type === 'link' && m.attrs?.href) out = h('a', { href: m.attrs.href, target: '_blank', rel: 'noopener noreferrer nofollow' }, out)
      }
      return out
    }
    const node = (n: BodyNode): VNodeChild => {
      const kids = () => (n.content ?? []).map(node)
      switch (n.type) {
        case 'text': return text(n)
        case 'mention': {
          const id = String(n.attrs?.id ?? '')
          const label = typeof n.attrs?.label === 'string' ? n.attrs.label : null
          return h('span', {
            'class': 'mention',
            'data-type': 'mention',
            'data-id': id,
            'role': 'link',
            'tabindex': 0,
            'onClick': () => emit('mention', id),
            'onKeydown': (e: KeyboardEvent) => e.key === 'Enter' && emit('mention', id)
          }, [h(MentionChip, { id, label })])
        }
        case 'paragraph': return h('p', kids())
        case 'heading': return h('h2', kids())
        case 'bulletList': return h('ul', kids())
        case 'orderedList': return h('ol', { start: Number(n.attrs?.start ?? 1) || 1 }, kids())
        case 'listItem': return h('li', kids())
        case 'blockquote': return h('blockquote', kids())
        case 'horizontalRule': return h('hr')
        default: return n.content ? kids() : null
      }
    }
    return (): VNode => {
      const blocks = props.doc?.content ?? []
      return h('div', { class: 'body-text' }, blocks.length
        ? blocks.map(node)
        : [h('p', { 'class': 'is-empty is-editor-empty', 'data-placeholder': props.placeholder })])
    }
  }
})
