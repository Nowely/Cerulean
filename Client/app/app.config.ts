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
      variants: {
        variant: {
          underline: 'bg-transparent border-0 border-b border-default rounded-none focus:border-primary-500'
        }
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
      variants: {
        variant: {
          underline: 'bg-transparent border-0 border-b border-default rounded-none focus:border-primary-500'
        }
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
        label: 'text-[11px] font-semibold uppercase tracking-wider text-muted'
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
    },
    formField: {
      slots: {
        label: 'text-xs font-medium text-muted'
      },
      defaultVariants: {
        size: 'md'
      }
    },
    avatar: {
      slots: {
        fallback: 'font-semibold bg-transparent'
      }
    },
    slideover: {
      slots: {
        body: 'p-4 sm:p-5'
      },
      variants: {
        side: {
          bottom: {
            content: 'max-h-[85dvh] rounded-t-xl'
          },
          right: {
            content: 'w-80 sm:w-96'
          }
        }
      }
    },
    empty: {
      slots: {
        avatar: 'size-12 mb-3'
      }
    },
    progress: {
      slots: {
        base: 'h-1.5 rounded-full'
      }
    }
  }
})
