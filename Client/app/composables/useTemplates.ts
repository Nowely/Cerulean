// Record templates (v24, И9, И7) and «В заметку» (v24, И3) across screens: making and deleting a template with their
// toasts, «+» on a «Шаблоны» row aiming the page's composer at a template, and the paragraph just sent «В заметку»,
// which its body tints fresh for 4 s
import { nextTick, onUnmounted, ref, watch, type Ref } from 'vue'
import { useRouter } from '#imports'
import type { Id, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNotify } from './useNotify'

/** «+» on a «Шаблоны» row: the next record written on that page is made by this template */
const aim = ref<{ pageId: Id, id: Id } | null>(null)
/** The body that just got a paragraph «В заметку»: its last block is tinted fresh */
const fresh = ref<{ ownerId: Id, at: number } | null>(null)

export function useTemplates() {
  const data = useDataStore()
  const notify = useNotify()
  const router = useRouter()

  /** «Сделать шаблоном» (light): the toast says where it went, with «Отменить»; a page name is never quoted (v24 fixes, 22) */
  function make(rec: Rec) {
    const made = data.makeTemplate(rec.id)
    if (!made) return
    notify(`Шаблон «${made.tpl.name}» ${made.updated ? 'обновлён' : 'сохранён'} в ${made.page.title || 'Без названия'}`, { label: 'Отменить', run: made.undo })
  }

  /** «Удалить шаблон» (medium): it goes at once, its page opens, and the toast brings it back */
  function remove(id: Id) {
    const gone = data.removeTemplate(id)
    if (!gone) return
    void router.replace(`/p/${gone.page.id}`)
    notify(`Шаблон «${gone.tpl.name}» удалён`, { label: 'Отменить', run: gone.undo })
  }

  return {
    aim,
    fresh,
    make,
    remove,
    /** «+» on a «Шаблоны» row: the page's composer takes it for one record and the focus */
    use: (pageId: Id, id: Id) => {
      aim.value = { pageId, id }
    },
    /** A paragraph just landed at the end of this body */
    noted: (ownerId: Id) => {
      fresh.value = { ownerId, at: Date.now() }
    }
  }
}

/**
 * The fresh tint under the paragraph just sent «В заметку»: the box of the last block of the body inside `box`, for 5 s
 * (4 s held, 1 s fading, as a fresh row), scrolled into view above the composer. A layer under the text, so the
 * editor's own DOM is never touched
 */
export function useFreshTail(ownerId: () => Id | undefined, box: Ref<HTMLElement | null>) {
  const tail = ref<{ key: number, style: Record<string, string> } | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(fresh, async (f) => {
    if (!f || f.ownerId !== ownerId()) return
    await nextTick()
    await new Promise(r => requestAnimationFrame(r))
    const root = box.value
    const text = root ? [...root.querySelectorAll<HTMLElement>('.body-text')].find(el => el.offsetParent) : undefined
    const last = text?.lastElementChild
    if (!root || !(last instanceof HTMLElement)) return
    const a = root.getBoundingClientRect()
    const b = last.getBoundingClientRect()
    tail.value = { key: f.at, style: { top: `${b.top - a.top - 2}px`, height: `${b.height + 4}px` } }
    last.scrollIntoView({ block: 'nearest' })
    clearTimeout(timer)
    timer = setTimeout(() => tail.value = null, 5000)
  })
  onUnmounted(() => clearTimeout(timer))
  return tail
}
