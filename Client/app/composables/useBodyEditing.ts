// The body being edited (v23): one at a time in the whole app. While a body has focus the editing bar takes the
// composer's slot of the surface that holds it: the screen (`main`: a record page, a page's note) or the preview
// (`peek`: the phone's sheet, the desktop's right panel, where the page's composer stays). The editor fills `actions`;
// the bar reads `state` and calls them. Nothing here imports Tiptap, so the bar and the screens stay light.
import { computed, ref, shallowRef, type InjectionKey } from 'vue'
import type { BodyOwner, MentionTarget } from '~/domain/body'

export type BodySurface = 'main' | 'peek'

/** Which surface a body belongs to; PreviewPane provides 'peek', everything else is 'main' */
export const BODY_SURFACE: InjectionKey<BodySurface> = Symbol('body-surface')

export type BodyKind = 'heading' | 'bullet' | 'ordered' | 'quote'

/** What the bar shows of the editor's state, refreshed on every change of the text or the selection */
export interface BodyState {
  canUndo: boolean
  /** Some text is selected: the selection face */
  selected: boolean
  /** The kind of the caret's line, pressed in the caret face */
  kind: BodyKind | null
  bold: boolean
  italic: boolean
}

/** The «@» face: what is typed after «@», and up to three things to mention */
export interface MentionFace {
  query: string
  items: MentionTarget[]
  /** The chip ↑/↓ point at (desktop) */
  hi: number
}

export interface SlashItem {
  kind: BodyKind | 'mention'
  label: string
  keys: string
  icon: string
}

/** «/» on desktop: the caret face's tools in a popover at the caret */
export interface SlashMenu {
  items: SlashItem[]
  hi: number
  rect: { left: number, top: number, bottom: number }
}

export interface BodyActions {
  done: () => void
  undo: () => void
  toggle: (kind: BodyKind) => void
  mark: (mark: 'bold' | 'italic') => void
  /** The caret face types «@»; the selection face makes the selected words the query */
  mention: () => void
  /** Puts a chip in place of «@» and the query (or of the selection) */
  pickMention: (t: MentionTarget) => void
  /** «Ссылка»: the address field; Enter or «Готово» applies it */
  link: () => void
  applyLink: (href: string) => void
  cancelLink: () => void
  /** The ring: «Сделать подпунктом» on a record, «Сделать записью» on a page note (v24) */
  toSub: () => void
  pickSlash: (item: SlashItem) => void
  /** Back to the text after «Связать» closed */
  refocus: () => void
}

export interface BodySession {
  owner: BodyOwner
  surface: BodySurface
  /** The editor's root element: a tap there keeps editing */
  root: HTMLElement
  /** The ring of the selection face: a record's body or a page's note */
  canSub: boolean
  /** What the ring does there, its label and tooltip: «Сделать подпунктом» or «Сделать записью» (v24) */
  subLabel: string
  actions: BodyActions
}

const session = shallowRef<BodySession | null>(null)
const state = ref<BodyState>({ canUndo: false, selected: false, kind: null, bold: false, italic: false })
const mention = ref<MentionFace | null>(null)
/** The address field of «Ссылка», with what is typed in it */
const linking = ref<{ href: string } | null>(null)
const slash = ref<SlashMenu | null>(null)
/** The bar's own element, so a tap on it never ends the editing */
const barEl = shallowRef<HTMLElement | null>(null)
/** «Ещё…» in the «@» face: «Связать» opens to mention */
const moreOpen = ref(false)

export function useBodyEditing() {
  const face = computed<'caret' | 'select' | 'mention' | 'link'>(() =>
    linking.value ? 'link' : mention.value ? 'mention' : state.value.selected ? 'select' : 'caret')

  /** Whether the bar shows on this surface */
  const on = (surface: BodySurface) => session.value?.surface === surface

  function begin(s: BodySession) {
    session.value = s
  }

  /** The session ends: the composer comes back */
  function end(s?: BodySession) {
    if (s && session.value !== s) return
    session.value = null
    mention.value = null
    linking.value = null
    slash.value = null
    moreOpen.value = false
  }

  /** Whether an element belongs to the editing: the body, the bar, «Связать» opened from it, a popover of the editor */
  function keeps(el: Element | null): boolean {
    if (moreOpen.value) return true
    if (!el) return false
    const s = session.value
    if (s?.root.contains(el) || barEl.value?.contains(el)) return true
    return !!el.closest('[data-body-keep]')
  }

  return { session, state, mention, linking, slash, barEl, moreOpen, face, on, begin, end, keeps }
}
