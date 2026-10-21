// v23 option colours, words and page icons (items 12, 22–25, D4–D6): the app side of the new mockup states
export default ({ MOBILE, DESKTOP, settle, openPage }) => {
  /** «Значок и цвет» from the page «⋯»: a sheet on a phone, a popover at the «⋯» on desktop */
  async function iconPicker(p, title) {
    await openPage(p, title)
    await p.getByRole('button', { name: 'Действия со страницей' }).click()
    await settle(p, 500)
    await p.getByRole('menuitem', { name: 'Значок и цвет' }).or(p.getByRole('button', { name: 'Значок и цвет' })).first().click()
    // The sheet's code loads on first use, then it slides in
    await settle(p, 1200)
  }
  return [
    // Идеи keeps «Без цвета»: its lightbulb selected on the neutral tile, the muted swatch ringed
    { name: 'MobileIcon', device: MOBILE, run: p => iconPicker(p, 'Идеи') },
    // Книги, purple: the popover at the page «⋯», the book selected in purple
    { name: 'PagesIcon', device: DESKTOP, run: p => iconPicker(p, 'Книги') }
  ]
}
