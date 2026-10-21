// Plain object: `defineAppConfig` is an auto-import, and this file also runs in Nitro
import type { AppConfigInput } from 'nuxt/schema'

// Theme-defined sizes (main.css @theme) that tailwind-merge has to know about,
// otherwise `text-record` reads as a colour and `rounded-card` never replaces `rounded-md`
const textRoles = ['11', '13', '15', '17', '28', '30', 'title', 'sheet', 'record', 'row', 'body', 'meta', 'cap', 'caption', 'input']
const radii = ['card', 'chip', 'item', 'badge', 'tile', 'tile-sm', 'tile-lg', 'sheet', 'pill', 'pill-grown']

// Focus is one accent outline everywhere, as in the mockups
const focus = 'outline-primary focus-visible:outline-2 focus-visible:outline-offset-1'

export default {
  // Lucide draws with a 2px stroke; the mockups use about 1.75, which reads calmer next to 14–17px text
  icon: {
    customize: (content: string) => content.replaceAll('stroke-width="2"', 'stroke-width="1.75"')
  },

  ui: {
    colors: {
      primary: 'steel',
      neutral: 'graphite'
    },
    tv: {
      twMergeConfig: {
        extend: {
          theme: {
            text: textRoles,
            radius: radii,
            shadow: ['float', 'seg']
          }
        }
      }
    },

    // Buttons: radius 8 (nested inside the 12 of cards); 36px by default, 32 for the dense desktop receipt actions,
    // 44 for primary actions on touch. A square (icon-only) button is a 44pt target on
    // mobile and a 32px one on desktop.
    button: {
      slots: {
        base: 'rounded-item font-medium justify-center',
        leadingIcon: 'shrink-0',
        trailingIcon: 'shrink-0'
      },
      variants: {
        size: {
          xs: { base: 'h-7 px-2 text-13 gap-1', leadingIcon: 'size-4', trailingIcon: 'size-4' },
          sm: { base: 'h-8 px-3 text-sm gap-1.5', leadingIcon: 'size-4', trailingIcon: 'size-4' },
          md: { base: 'h-9 px-3 text-sm gap-1.5', leadingIcon: 'size-4.5', trailingIcon: 'size-4.5' },
          lg: { base: 'h-11 px-4 text-base gap-2', leadingIcon: 'size-5', trailingIcon: 'size-5' },
          xl: { base: 'h-12 px-5 text-base gap-2', leadingIcon: 'size-5', trailingIcon: 'size-5' }
        }
      },
      compoundVariants: [
        { color: ['primary', 'neutral', 'error'], class: focus },
        { square: true, size: 'xs', class: 'size-7 p-0' },
        { square: true, size: 'sm', class: 'size-8 p-0' },
        { square: true, size: 'md', class: 'size-11 p-0 lg:size-8 lg:rounded-item' },
        { square: true, size: 'lg', class: 'size-11 p-0' },
        // Chip button («Не туда», «Отменить», «Открыть»): no border, the chip fill of where it sits
        // (chip on bg and cards, chip-elev inside a raised surface), chip-pressed for hover, pressed and open
        {
          color: 'neutral',
          variant: 'outline',
          class: 'ring-0 bg-btn text-highlighted hover:bg-btn-pressed active:bg-btn-pressed aria-pressed:bg-btn-pressed aria-expanded:bg-btn-pressed'
        },
        // Quiet icon and text buttons: muted ink, hover tint, pressed state
        {
          color: 'neutral',
          variant: 'ghost',
          class: 'text-toned hover:bg-muted hover:text-highlighted active:bg-accented aria-expanded:bg-elevated aria-expanded:text-highlighted'
        },
        {
          color: 'neutral',
          variant: 'link',
          class: 'text-toned hover:text-highlighted active:text-highlighted px-0'
        },
        { color: 'primary', variant: 'solid', class: 'hover:bg-primary/90 active:bg-primary/85' },
        {
          color: 'primary',
          variant: 'ghost',
          class: 'text-accent-ink hover:bg-accent-soft active:bg-accent-soft'
        },
        { color: 'primary', variant: 'link', class: 'text-accent-ink hover:text-accent-ink/80 px-0' },
        {
          color: 'error',
          variant: ['ghost', 'outline', 'link'],
          class: 'text-warn-ink'
        },
        {
          color: 'error',
          variant: 'outline',
          class: 'ring-0 bg-btn hover:bg-btn-pressed active:bg-btn-pressed'
        },
        // The filled «Удалить» (desktop button, confirm dialogs)
        { color: 'error', variant: 'solid', class: 'bg-warn-fill text-on-warn hover:bg-warn-fill/90 active:bg-warn-fill/85' }
      ],
      defaultVariants: {
        color: 'neutral',
        variant: 'outline',
        size: 'md'
      }
    },

    // Fields: surface, hairline, radius 10, accent ring on focus, 16px on touch screens
    input: {
      slots: {
        base: 'rounded-chip text-input placeholder:text-dimmed'
      },
      variants: {
        variant: {
          outline: 'text-highlighted bg-default ring ring-inset ring-default',
          soft: 'text-highlighted bg-trk hover:bg-trk focus:bg-trk'
        },
        size: {
          md: { base: 'h-11 lg:h-9 px-3 text-input', leading: 'ps-3', trailing: 'pe-2', leadingIcon: 'size-5', trailingIcon: 'size-5' },
          lg: { base: 'h-11 px-3 text-input', leading: 'ps-3', trailing: 'pe-2', leadingIcon: 'size-5', trailingIcon: 'size-5' }
        }
      },
      defaultVariants: {
        variant: 'outline',
        size: 'md'
      }
    },
    textarea: {
      slots: {
        base: 'rounded-chip text-input placeholder:text-dimmed resize-none'
      },
      variants: {
        variant: {
          outline: 'text-highlighted bg-default ring ring-inset ring-default'
        },
        size: {
          md: { base: 'px-3 py-2.5 text-input' }
        }
      },
      defaultVariants: {
        variant: 'outline',
        size: 'md'
      }
    },

    // Selects look like the outlined button; their list matches the dropdown menus
    select: {
      slots: {
        base: 'rounded-chip',
        trailingIcon: 'text-toned',
        content: 'rounded-card shadow-float',
        item: 'before:rounded-item items-center'
      },
      variants: {
        variant: {
          outline: 'text-highlighted bg-default ring ring-inset ring-default hover:bg-default hover:ring-accented'
        },
        size: {
          md: { base: 'h-11 lg:h-9 px-3 gap-1.5 text-sm', trailing: 'pe-2.5', trailingIcon: 'size-4', item: 'min-h-9 px-2 py-1.5 text-body' }
        }
      }
    },

    // Switch: 40×24 track, 20px knob; off track is the ring token so it stays visible (3:1)
    switch: {
      slots: {
        // The 44px touch target belongs to the button itself, so a tap anywhere on it toggles
        base: 'hit-44 data-[state=unchecked]:bg-ring',
        thumb: 'bg-knob shadow-seg'
      },
      variants: {
        size: {
          md: {
            base: 'w-10',
            container: 'h-6',
            thumb: 'size-5 data-[state=checked]:translate-x-4 data-[state=checked]:rtl:-translate-x-4'
          }
        }
      },
      compoundVariants: [{ color: 'primary', class: { base: focus } }]
    },

    // Overlays: surface, hairline, radius 12, the float shadow
    popover: {
      slots: {
        content: 'raised rounded-card shadow-float ring-default'
      }
    },
    dropdownMenu: {
      slots: {
        content: 'raised rounded-card shadow-float min-w-48',
        group: 'p-1',
        separator: 'my-1',
        item: 'before:rounded-item items-center',
        itemLabel: 'truncate',
        itemTrailing: 'text-toned'
      },
      variants: {
        active: {
          false: {
            item: 'data-highlighted:before:bg-muted data-[state=open]:before:bg-muted',
            itemLeadingIcon: 'text-toned group-data-highlighted:text-highlighted'
          }
        },
        size: {
          md: { item: 'min-h-9 px-2 py-1.5 gap-2.5 text-body', label: 'px-2 py-1.5 text-caption text-muted', itemLeadingIcon: 'size-4.5' }
        }
      }
    },
    contextMenu: {
      slots: {
        content: 'rounded-card shadow-float min-w-48',
        group: 'p-1',
        item: 'before:rounded-item items-center'
      },
      variants: {
        active: {
          false: {
            item: 'data-highlighted:before:bg-muted',
            itemLeadingIcon: 'text-toned group-data-highlighted:text-highlighted'
          }
        },
        size: {
          md: { item: 'min-h-9 px-2 py-1.5 gap-2.5 text-body', itemLeadingIcon: 'size-4.5' }
        }
      }
    },
    modal: {
      slots: {
        overlay: 'bg-scrim',
        content: 'raised rounded-card shadow-float ring ring-default divide-y-0',
        header: 'min-h-0 px-5 pt-5 pb-0',
        body: 'p-5',
        footer: 'px-5 pb-5 pt-0 justify-end',
        title: 'text-sheet text-highlighted',
        description: 'text-meta text-toned'
      }
    },
    // Mobile sheets: radius 20 on top, a handle in the ring colour
    drawer: {
      slots: {
        overlay: 'bg-scrim',
        content: 'raised bg-default ring ring-default',
        handle: '!w-9 !h-1.25 !bg-ring rounded-full',
        container: 'p-0 gap-0',
        title: 'text-sheet text-highlighted',
        description: 'text-meta text-toned'
      },
      compoundVariants: [
        { direction: 'bottom', inset: false, class: { content: 'rounded-t-sheet', handle: 'mt-2 mb-1' } }
      ]
    },
    tooltip: {
      slots: {
        content: 'bg-inverted text-canvas ring-0 shadow-none rounded-badge h-6 px-2 text-xs'
      }
    },
    kbd: {
      base: 'rounded-badge font-sans normal-case',
      variants: {
        size: {
          md: 'h-5 min-w-5 px-1.5 text-xs'
        }
      },
      compoundVariants: [
        { color: 'neutral', variant: 'outline', class: 'ring-line2 text-toned bg-transparent' }
      ],
      defaultVariants: {
        variant: 'outline'
      }
    },
    skeleton: {
      base: 'bg-sel rounded-full animate-none'
    },
    separator: {
      slots: {
        border: 'border-default'
      }
    }
  }
} satisfies AppConfigInput
