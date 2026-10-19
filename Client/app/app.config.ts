export default defineAppConfig({
  ui: {
    colors: {
      primary: 'cerulean',
      neutral: 'slate'
    },
    input: {
      slots: {
        base: 'rounded-lg'
      },
      variants: {
        variant: {
          underline: 'bg-transparent border-0 border-b border-default rounded-none focus:border-primary-500'
        },
        size: {
          sm: {
            base: 'h-9 text-sm'
          }
        }
      },
      defaultVariants: {
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
        variant: 'soft'
      }
    },
    button: {
      slots: {
        base: 'rounded-lg font-medium'
      },
      defaultVariants: {
        variant: 'solid'
      }
    },
    badge: {
      slots: {
        base: 'rounded-full px-2 py-0.5 text-xs font-medium inline-flex items-center gap-1'
      },
      defaultVariants: {
        variant: 'soft'
      }
    },
    separator: {
      slots: {
        label: 'text-xs font-semibold uppercase tracking-wider text-muted'
      }
    },
    card: {
      slots: {
        body: 'p-4'
      },
      variants: {
        compact: {
          body: 'p-3'
        },
        flat: {
          body: 'p-0'
        },
        flush: {
          body: 'p-3 space-y-2'
        },
        task: {
          root: 'border-l-4',
          header: 'p-3 pb-0',
          body: 'p-3 pt-2 flex flex-col gap-2',
          footer: 'p-3 pt-0'
        },
        notification: {
          root: 'rounded-none',
          body: 'px-4 py-3'
        }
      }
    },
    formField: {
      slots: {
        label: 'text-xs font-medium text-muted'
      }
    },
    avatar: {
      slots: {
        fallback: 'font-semibold'
      }
    },
    user: {
      slots: {
        description: 'truncate text-muted'
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
        },
        size: {
          sm: {
            content: 'max-h-[70dvh]'
          },
          md: {
            content: 'max-h-[85dvh]'
          },
          lg: {
            content: 'max-h-[90dvh]'
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
    },
    collapsible: {
      slots: {
        content: 'overflow-hidden'
      }
    },
    chatMessage: {
      variants: {
        variant: {
          own: {
            content: 'bg-primary-500 text-white rounded-br-md'
          },
          other: {
            content: 'bg-elevated rounded-bl-md'
          }
        }
      }
    },
    chatPrompt: {
      variants: {
        variant: {
          pill: {
            root: 'rounded-2xl'
          }
        }
      }
    }
  }
})
