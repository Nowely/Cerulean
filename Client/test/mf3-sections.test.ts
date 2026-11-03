import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'

describe('main flow 3 sections', () => {
  it('inserts at the start or after a section without changing the default append', async () => {
    setActivePinia(createPinia())
    const data = useDataStore()
    await data.init({ dbName: 'mf3-sections-insert' })
    const home = data.createSection('Дом')
    data.createSection('Личное')
    data.createSection('Работа', null)
    data.createSection('Проекты', home.id)
    expect(data.sectionList.map(s => s.name)).toEqual(['Работа', 'Дом', 'Проекты', 'Личное'])
  })

  it('restores a removed section and its pages, but does not take a page moved elsewhere', async () => {
    setActivePinia(createPinia())
    const data = useDataStore()
    await data.init({ dbName: 'mf3-sections-undo' })
    const home = data.createSection('Дом')
    const other = data.createSection('Личное')
    const first = data.createPage({ title: 'Первая', sectionId: home.id })
    const second = data.createPage({ title: 'Вторая', sectionId: home.id })
    const firstOrder = first.order
    const { pages, undo } = data.removeSection(home.id)
    expect(pages).toEqual([first.id, second.id])
    expect(data.pages[first.id]!.sectionId).toBeNull()
    data.updatePage(second.id, { sectionId: other.id })
    undo()
    expect(data.sectionList.map(s => s.name)).toEqual(['Дом', 'Личное'])
    expect(data.pages[first.id]!.sectionId).toBe(home.id)
    expect(data.pages[second.id]!.sectionId).toBe(other.id)
    expect(data.pages[first.id]!.order).toBe(firstOrder)
  })
})
