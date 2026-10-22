// «Тема» is kept by color-mode in localStorage, out of the data store's reach: another tab's choice applies here too
import { defineNuxtPlugin, useColorMode } from '#imports'

export default defineNuxtPlugin(() => {
  const colorMode = useColorMode()
  window.addEventListener('storage', (e) => {
    if (e.key === 'cerulean-theme' && e.newValue) colorMode.preference = e.newValue
  })
})
