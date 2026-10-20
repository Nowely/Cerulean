# Авто against a real model

`cases.json` holds 51 lines a person might type into Чат, each with where it should go on the demo pages
(Продукты, Задачи, Дела по дому, Цели, Идеи, Книги) and what the records should look like: the split of a
shopping line, departments, quantities, dates and times, and a name for a new page when nothing fits.
A list of allowed pages (with `null` for Уточнение) marks lines where more than one answer is reasonable.

```bash
EVAL_KEY=sk-… pnpm eval                          # OpenAI, GPT-6 Luna (Быстрая)
EVAL_KEY=sk-… EVAL_EXACT=1 pnpm eval             # Точная
EVAL_PROVIDER=anthropic EVAL_KEY=sk-ant-… pnpm eval
EVAL_PROVIDER=openrouter EVAL_KEY=sk-or-… EVAL_MODEL=openai/gpt-6-luna pnpm eval
EVAL_PROVIDER=custom EVAL_BASE_URL=https://…/v1 EVAL_MODEL=… EVAL_KEY=… pnpm eval
```

It sends every line the way the app does (`askModel` with the prompt from `app/domain/prompt.ts`, the demo
pages, the clock on Monday 19 Oct 2026) and prints each answer with what was wrong, plus totals. It skips
itself without `EVAL_KEY` and is not part of `pnpm test` or CI.

## Results so far

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
