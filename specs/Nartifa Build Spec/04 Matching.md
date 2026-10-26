# 04 Matching

How the quiz picks one artwork. Written so the logic can be changed later without rediscovering why it works this way.

## Inputs

Visitor answers and artwork tags have the same six values:

| Key | Values |
| --- | --- |
| `sight`, `smell`, `taste`, `touch`, `hearing` | `a` / `b` |
| `feeling` | `joy` / `anger` / `sorrow` / `delight` |

Only `status = live` works take part. A live work always has all six tags (02).

## Scoring — Decided

```
score(work, answers) =
    count of the five senses where work[sense] == answers[sense]
  + FEELING_WEIGHT × (work.feeling == answers.feeling ? 1 : 0)

FEELING_WEIGHT = 1   // in src/config/quiz.ts
```

- Highest score wins. A full match scores 6.
- **There is always a winner**, which covers "no exact match → show the closest" (design spec 04).
- Feeling weight is **1, equal to one sense** — Decided for now.

## Ties — Decided

**Pick randomly among all works with the top score.**

Why: there are 128 possible answer sets (2⁵ × 4) and about 100 works. Some answer sets match several works exactly; many match none, so several works tie on 5. With a fixed tie-break, the losing works could **never** be reached through the quiz. Random ties let every work surface.

Trade-off accepted: the same answers can give a different work on a retake.

## Where it runs — Decided

In the browser.

1. The quiz page is rendered with a compact list of live works: `[{ id, t: "abaab", f: "joy" }, …]` (about 2KB for 100 works). The tags are not secret. The list is part of the cached quiz page and cleared by the `works` tag (08).
2. On the step 6 tap, `matching.ts` scores the list and picks a winner instantly. The random tie pick happens here, in the browser, so the cached page stays the same for everyone.
3. During the 350ms highlight hold, prefetch `/works/{id}`, then set the reveal flag and navigate (03). No loading screen (design spec 04).

`lib/matching.ts` is a pure function with unit tests (exact match, closest match, ties, empty list).

## Edge cases

| Case | Behavior |
| --- | --- |
| No live works (only before launch) | Start leads to one line: "No works yet." |
| One live work | Always that work |
| A work hidden after the quiz page loaded | Visitor gets the 404 page. Acceptable at this scale |

## How to change it later

| Want | Change |
| --- | --- |
| Feeling matters more | Set `FEELING_WEIGHT = 2` (feeling wins over one sense) |
| Same answers → same work every time | Replace the random pick with a fixed rule (e.g. newest). Note: tied works can become unreachable |
| Consistent per person, varied across people | Seed the random pick with a per-browser value (e.g. stored in localStorage) |
| Show several works ("top X") | Sort by score (random order within ties) and take the first X — Deferred in v1 |
| Weight a specific sense | Add per-sense weights to the config; the formula already sums per sense |
| Change words or icons | i18n / config only. Tags stay `a`/`b`, so existing works keep their meaning |
