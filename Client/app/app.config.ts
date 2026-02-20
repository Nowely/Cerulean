export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'slate'
    },
    input: {
      slots: {
        base: 'rounded-lg'
      },
      defaultVariants: {
        size: 'md',
        variant: 'soft'
      }
    },
    textarea: {
      slots: {
        base: 'rounded-lg resize-none'
      },
      defaultVariants: {
        size: 'md',
        variant: 'soft'
      }
    },
    button: {
      slots: {
        base: 'rounded-lg font-medium'
      },
      defaultVariants: {
        size: 'md',
        variant: 'solid'
      }
    },
    badge: {
      slots: {
        base: 'rounded-full px-2 py-0.5 text-[11px] font-medium inline-flex items-center gap-1'
      },
      defaultVariants: {
        size: 'md',
        variant: 'soft'
      }
    },
    separator: {
      slots: {
        label: 'text-[11px] font-semibold uppercase tracking-wider text-gray-500'
      }
    },
    card: {
      slots: {
        body: 'p-4'
      },
      variants: {
        compact: {
          body: 'p-3'
        }
      }
    }
  }
})
