export const FORM_LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-wider text-gray-500'

export const INPUT_BASE_CLASS = 'h-10 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 text-sm outline-none focus:ring-1 focus:ring-primary-500'

export const TEXTAREA_BASE_CLASS = 'resize-none rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm leading-relaxed outline-none focus:ring-1 focus:ring-primary-500'

export const ICON_BUTTON_BASE_CLASS = 'flex items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'

export function selectableChipClass(selected: boolean): string {
  return selected
    ? 'bg-primary-500/15 ring-1 ring-primary-500/30'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
}
