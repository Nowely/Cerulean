export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'slate'
    },
    inputs: {
      default: {
        base: 'h-10 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 text-sm outline-none focus:ring-1 focus:ring-primary-500',
        placeholder: 'placeholder:text-gray-400'
      }
    },
    textareas: {
      default: {
        base: 'resize-none rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm leading-relaxed outline-none focus:ring-1 focus:ring-primary-500'
      }
    },
    badges: {
      base: 'rounded-full px-2 py-0.5 text-[11px] font-medium inline-flex items-center gap-1'
    },
    avatars: {
      base: 'flex shrink-0 items-center justify-center rounded-full font-semibold text-white'
    },
    buttons: {
      default: {
        base: 'rounded-lg font-medium transition-colors'
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
