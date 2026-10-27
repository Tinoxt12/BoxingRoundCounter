# Fight data guide

This project keeps fight records in `src/data/fights/`, with one JSON file per fight. The file `_TEMPLATE.json` shows the complete record shape; its placeholder values are not a real fight and the loader excludes it.

## Record fields

- `id`: unique lowercase kebab-case key used by routes and lookups.
- `title`: readable matchup title.
- `date`: real calendar date in `YYYY-MM-DD` format.
- `venue` and `location`: optional venue and location details.
- `weightClass`: division name.
- `titlesOnTheLine`: optional array of titles contested.
- `boxers.a` and `boxers.b`: the first-listed boxer and second-listed boxer. Keep their order consistent throughout the record.
- `scheduledRounds`: scheduled length, from 1 to 15.
- `result`: method and winner, plus `endedInRound` and `endedAtTime` for a stoppage when known. The template uses `null` for these optional placeholders; remove them for a decision or replace them with values for a stoppage.
- `judges`: official judge names and fight totals. Include `rounds` only when reliable round-by-round scores are published; totals-only cards are valid.
- `roundEvents`: optional knockdowns and point deductions by round. A point deduction is needed to explain final round scores below the usual 10-point must score.
- `controversy`: optional editorial rating from 1 to 5 and a concise explanation. Keep the explanation factual and sourced.
- `sources`: non-empty list of direct URLs or the string `fixture` for fictional test data.
- `verified`: boolean. Keep it `false` until the record and totals have been checked.
- `roundStats`: optional punch-statistics data reserved for a later phase. Do not invent these numbers.

## Sources and verification

Use sources that publish the result or scorecards directly, such as a boxing commission, the event organizer, a reputable boxing statistics database, or a well-established sports news outlet that reproduces the official cards. Prefer primary records where available. Keep a direct URL for each source so someone can audit the entry.

Double-check every judge's totals against at least two reputable sources before setting `verified` to `true`. For round-by-round cards, confirm that each judge covers every contested round and that the round sums equal the published totals. If round scores are unavailable, omit the `rounds` field rather than estimating it. Never use this template or the fictional fixtures as factual fight data.

## Validation choices

Validation is hand-written in `src/data/validate.ts` to keep the domain checks explicit and avoid adding a schema dependency for a small, static dataset. It reports errors without changing or repairing input records.
