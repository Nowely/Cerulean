export function selectableChipClass(selected: boolean): string {
  return selected
    ? 'bg-primary-500/15 ring-1 ring-primary-500/30'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
}
