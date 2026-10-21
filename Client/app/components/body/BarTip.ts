// A tool's tooltip on the desktop bar (v23, D1): its name, then its keys dimmer («Список  - пробел», «Жирный  Ctrl B»).
// On a phone, and until the overlay code is in, the tool alone.
import { defineComponent, h } from 'vue'
import { LazyUTooltip } from '#components'
import { useScreen } from '~/composables/useScreen'
import { useLater } from '~/composables/useLater'

export default defineComponent({
  name: 'BarTip',
  props: {
    label: { type: String, required: true },
    keys: { type: String, default: '' }
  },
  setup(props, { slots }) {
    const { isDesktop } = useScreen()
    const later = useLater()
    return () => {
      if (!isDesktop.value || !later.ready.value) return slots.default?.()
      return h(LazyUTooltip, { text: props.keys ? `${props.label} · ${props.keys}` : props.label, delayDuration: 300, content: { side: 'top' } }, {
        default: () => slots.default?.(),
        content: () => [
          h('span', props.label),
          props.keys ? h('span', { class: 'ms-2 opacity-60' }, props.keys) : null
        ]
      })
    }
  }
})
