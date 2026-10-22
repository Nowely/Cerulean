# Авто against a real model

`cases.json` holds 56 lines a person might type into the field, each with where its records should go and what
they should look like: the split of a line, departments, quantities, dates and times, and a record's text. Since
the main flow (item 23) every record has its own page, and a record no page clearly fits goes to Входящие (`null`):
nothing asks and no page is made. A list of allowed pages marks lines where more than one answer is reasonable, and
an item's own `page` overrides the line's. Most lines are filed on the demo pages (Продукты, Задачи, Дела по дому,
Цели, Идеи, Книги); lines with `"on": "first"` on the first run's (Покупки, Задачи, Идеи), plus the `extra` pages
the person made, such as Подарки for «Купить сыр и пазл для Пети».

```bash
EVAL_KEY=sk-… pnpm eval                          # OpenAI, GPT-6 Luna (Быстрая)
EVAL_KEY=sk-… EVAL_EXACT=1 pnpm eval             # Точная
EVAL_PROVIDER=anthropic EVAL_KEY=sk-ant-… pnpm eval
EVAL_PROVIDER=openrouter EVAL_KEY=sk-or-… EVAL_MODEL=openai/gpt-6-luna pnpm eval
EVAL_PROVIDER=custom EVAL_BASE_URL=https://…/v1 EVAL_MODEL=… EVAL_KEY=… pnpm eval
```

It sends every line the way the app does (`askModel` with the prompt from `app/domain/prompt.ts`, the pages
without those that only collect, the clock on Monday 19 Oct 2026) and prints each answer with what was wrong, plus totals. It skips
itself without `EVAL_KEY` and is not part of `pnpm test` or CI.

## Results so far

The per-record contract of the main flow (one page per record, the record's text, Входящие for the unsure) has not
been measured yet: no key was available when it landed. The table below is the contract before it.

Claude Haiku stood in for the model: the same instructions and input, one answer per line.

| Prompt | Lines without a mistake | What went wrong |
| --- | --- | --- |
| v1 | 43 / 51 | Shopping items kept the case of the line («Молока», «Яиц»); «почитать», «идея:» stayed in the text; numbers left goals («Пробежать без остановки», qty «10 км»); «по вторникам» became next Tuesday |
| v2 | 51 / 51 | — |

v2 marks list pages in the input (`"list": true`) and says what belongs in the text, quantity and date:
quantity only on list pages, the thing in the nominative there, no first word that only repeats the page,
and a date only for one specific day. Every answer used a real page id, and all four questions, all
departments and all dates were right in both runs.

Lines that never reach the model with «Сначала простые правила» on are decided by the rules alone; the
rules file «Мастер и Маргарита» (no quotes) under Дела по дому and «поменять лампочку в коридоре» under
Продукты.
