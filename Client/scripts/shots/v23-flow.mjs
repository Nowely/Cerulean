// v23, the flow of every screen (delta items 13–21, D3): the app side of the new mockup states. The updated states
// (Mobile → MobileHome, MobileInbox, MobileToday, MobileChat, MobileSettings, MobileNoStoreFix, MobileTrash) keep their
// scenarios in scripts/shots.mjs.
export default ({ MOBILE, DESKTOP, settle, open, openPage, data, keyed }) => {
  /** Покупки with the long list of MobileLong, every group open, scrolled until «Сыр» sits under «Молочное» */
  async function scrolledList(p) {
    await openPage(p, 'Покупки')
    await data(p, (d) => {
      const pg = d.livePages.find(x => x.title === 'Покупки')
      const dept = pg.props.find(x => x.name === 'Отдел')
      const qty = pg.props.find(x => x.name === 'Количество')
      const opt = n => dept.options.find(o => o.name === n).id
      const rows = [['Батон', 'Хлеб и выпечка'], ['Лаваш', 'Хлеб и выпечка', '2 шт'], ['Кефир', 'Молочное', '1 л'], ['Сметана', 'Молочное'], ['Творог', 'Молочное', '2 шт'], ['Йогурт', 'Молочное', '4 шт'],
        ['Огурцы', 'Овощи и фрукты'], ['Картошка', 'Овощи и фрукты', '2 кг'], ['Лук', 'Овощи и фрукты'], ['Яблоки', 'Овощи и фрукты', '1 кг'],
        ['Гречка', 'Бакалея'], ['Рис', 'Бакалея'], ['Макароны', 'Бакалея', '2 пачки'], ['Овсянка', 'Бакалея'], ['Соль', 'Бакалея'],
        ['Губки', 'Бытовая химия'], ['Мыло', 'Бытовая химия', '3 шт'], ['Пакеты для мусора', 'Бытовая химия']]
      rows.forEach(([text, group, n], i) => d.addRecord({ pageId: pg.id, text, order: 100 + i, addedAt: Date.now() - 3600000, values: { [dept.id]: opt(group), ...(n ? { [qty.id]: n } : {}) } }))
    })
    await settle(p, 400)
    // Twice: on desktop the slim header takes its 44px once the title block has gone
    for (let i = 0; i < 2; i++) {
      await p.evaluate(() => {
        const box = document.querySelector('.scroll-fade')
        const row = [...box.querySelectorAll('li')].find(li => li.textContent.includes('Сыр'))
        const cap = row.closest('section').querySelector('h3')
        box.scrollTop += row.getBoundingClientRect().top - box.getBoundingClientRect().top - cap.offsetHeight
      })
      await settle(p, 300)
    }
    await p.mouse.move(0, 0)
    await settle(p, 300)
  }

  /** Сегодня with «На неделе» opened */
  async function week(p) {
    await openPage(p, 'Сегодня', false)
    await p.getByRole('button', { name: /^На неделе/ }).click()
    await p.mouse.move(0, 0)
    await settle(p, 400)
  }

  /** Журнал scrolled up to «Вчера»: its receipts are one line */
  async function past(p) {
    await open(p, '/journal')
    // Desktop (MainPast): the record of the 8:52 receipt open in the panel, as in Chat
    if (p.viewportSize().width >= 1024) {
      await p.getByRole('button', { name: /^Позвонить стоматологу/ }).first().click()
      await settle(p, 400)
    }
    await p.evaluate(() => {
      const box = document.querySelector('.scroll-fade')
      const day = [...box.querySelectorAll('section h2')].find(h => h.textContent.trim() === 'Вчера')
      // The section, not its sticky caption: a caption stuck at its section's end would read as its top
      box.scrollTop += day.closest('section').getBoundingClientRect().top - box.getBoundingClientRect().top
    })
    await settle(p, 500)
  }

  return [
    { name: 'MobileListScrolled', device: MOBILE, run: scrolledList },
    { name: 'MobileTodayWeek', device: MOBILE, run: week },
    { name: 'MobileTodayEmpty', device: MOBILE, run: async (p) => {
      // What was due today and overdue is done; the week ahead is still there
      await open(p, '/')
      await data(p, (d) => {
        const today = new Date().toISOString().slice(0, 10)
        for (const r of d.liveRecords) if (r.due && r.due.date <= today && !r.done) d.updateRecord(r.id, { done: true })
      })
      await openPage(p, 'Сегодня', false)
    } },
    { name: 'MobileChatPast', device: MOBILE, run: past },
    { name: 'MobileTrashMenu', device: MOBILE, run: async (p) => {
      await open(p, '/settings/trash')
      await p.getByRole('button', { name: 'Ещё для «Позвонить в банк»' }).click()
      await settle(p, 600)
    } },
    { name: 'PagesInbox', device: DESKTOP, run: async (p) => {
      await openPage(p, 'Входящие')
      await p.getByRole('button', { name: 'Ещё для «Подарок маме на др»' }).click()
      // The pointer leaves the row for the menu, so no row stays lit under it
      await p.mouse.move(10, 600)
      await settle(p, 500)
    } },
    { name: 'PagesWeek', device: DESKTOP, run: week },
    { name: 'ListScrolled', device: DESKTOP, run: scrolledList },
    { name: 'MainPast', device: DESKTOP, run: past },
    { name: 'SettingsCopy', device: DESKTOP, run: async (p) => {
      await keyed(p, '/settings')
      await p.getByRole('button', { name: 'Сохранить копию', exact: true }).first().click()
      await settle(p, 500)
    } }
  ]
}
