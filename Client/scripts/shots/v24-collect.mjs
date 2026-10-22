// v24, pages that collect records (delta items 7–11, 17–27, 30; D1, D5, D8): the app side of the new mockup states.
// The updated states (MobileToday, MobileTodayWeek, MobileTodayEmpty, Mobile → MobileHome, PagesWeek, Home) keep their
// scenarios where they are; the demo itself moved (one world, global dates).
export default ({ MOBILE, DESKTOP, settle, openHome, openPage }) => {
  const desktop = p => p.viewportSize().width >= 1024

  /** На неделе, with the pointer off the row the link from Главная left it over */
  async function week(p) {
    await openPage(p, 'На неделе')
    await p.mouse.move(0, 0)
    await settle(p, 200)
  }

  /** «⋯» of the page → «Настроить вид»: a sheet on a phone, the 420px popover at that «⋯» on desktop */
  async function setup(p) {
    await week(p)
    await p.getByRole('button', { name: 'Действия со страницей' }).last().click()
    await settle(p, 500)
    await p.getByRole(desktop(p) ? 'menuitem' : 'button', { name: 'Настроить вид' }).last().click()
    await settle(p, 1500)
  }

  /** «Настроить вид» → «Все страницы» after «Эта страница»: the notice of «Откуда записи» (D8 on desktop) */
  async function changed(p) {
    await setup(p)
    await p.getByRole('radio', { name: 'Эта страница' }).click()
    await settle(p, 300)
    await p.getByRole('radio', { name: 'Все страницы' }).click()
    await settle(p, 700)
  }

  /** «Настроить вид» → «Фильтр»: its own sheet on a phone, the popover's second level on desktop */
  async function filter(p) {
    await setup(p)
    await p.getByRole('button', { name: /^Фильтр/ }).click()
    await settle(p, 900)
  }

  return [
    { name: 'MobileCollectPage', device: MOBILE, run: week },
    { name: 'MobileCollectSetup', device: MOBILE, run: setup },
    { name: 'MobileCollectFilter', device: MOBILE, run: filter },
    { name: 'MobileCollectHome', device: MOBILE, run: p => openHome(p) },
    { name: 'PagesCollect', device: DESKTOP, run: week },
    { name: 'PagesCollectView', device: DESKTOP, run: changed },
    { name: 'PagesCollectFilter', device: DESKTOP, run: filter },
    { name: 'HomeCollect', device: DESKTOP, run: p => openHome(p) }
  ]
}
