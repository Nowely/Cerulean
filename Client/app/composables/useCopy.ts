// «Сохранить копию»: everything in this browser as a file. The browser's own download is the only feedback.
import { useDataStore } from '~/stores/data'
import { toJSON, toMarkdown } from '~/domain/export'
import { dayKey } from '~/domain/dates'

export type CopyFormat = 'json' | 'md'

export function useCopy() {
  const data = useDataStore()

  function download(name: string, text: string, type: string) {
    const url = URL.createObjectURL(new File([text], name, { type }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  /** JSON can be loaded back («Загрузить копию»); Markdown is for reading */
  function saveCopy(format: CopyFormat = 'json') {
    const stamp = dayKey(Date.now())
    if (format === 'json') {
      download(`cerulean-${stamp}.json`, toJSON(data.snapshot()), 'application/json')
    } else {
      const live = data.livePages.filter(p => p.kind === 'page' || p.kind === 'inbox')
      download(`cerulean-${stamp}.md`, toMarkdown(live, data.liveRecords, data.sectionList), 'text/markdown')
    }
    data.setSettings({ copiedAt: Date.now() })
  }

  return { saveCopy }
}
