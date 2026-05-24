---
name: brendan-review
description: >-
  Review code against Brendan's conventions for this repo: shaping data at the
  lowest level so the frontend stays dumb, cohesive code grouping, naming, units,
  and timestamps (see "Code & naming conventions" in CLAUDE.md). Use when asked to
  "brendan review", "review my code", "check naming", or before committing
  data-layer / model changes. Reports findings by severity, pushes back where a
  choice conflicts with best practice, and fixes on request.
allowed-tools:
  - Bash
  - Read
  - Grep
  - Edit
  - Write
---

# Brendan review

Hold a change to the repo's review bar. Be direct and specific — every finding must name a
file/symbol and the concrete fix. **Push back** when something (in the code *or* in the
request) conflicts with best practice: state the disagreement, give the reason, propose the
better option, then defer to an explicit decision.

## Scope

Default to the working diff. Determine what to review:

```bash
git status --short
git diff --stat            # unstaged
git diff --staged --stat   # staged
```

Review the changed files (and new untracked files under `src/`). If the user named specific
files or a base branch, scope to that (`git diff <base>...HEAD`). Read each changed file in
full before judging — don't review from the diff hunk alone.

## Checklist

Walk every changed file against these. The first two matter most; each maps to a rule in
CLAUDE.md → "Code & naming conventions".

1. **Data shaped at the lowest level; the frontend stays dumb. (core)** Is all normalization
   and derivation done as far *down* the stack as the known context allows — here, the data
   layer (`normalize.ts`, `combineForecasts.ts`)? Flag any unit conversion, reshaping, unit
   math, or timestamp formatting living in a component / UI / scoring that should move down.
   We know the only consumer is the dashboard, so the model should emit exactly what the UI
   renders and components stay purely presentational.
2. **Cohesive grouping; nothing dumped in one file. (core)** Does each module hold one coherent
   concern (domain `sites.ts`, provider `openMeteoConstants.ts`, conversions `normalize.ts`,
   join `combineForecasts.ts`)? Flag a file mixing unrelated concerns, or an API URL sitting
   next to a domain constant. Config is split by reason-to-change — product decisions live in
   app config even when they're physically API params.
3. **Name matches contents.** Does each file/variable/function name tell you what's inside
   without opening it? Flag folder stutter (`weather/weatherTypes.ts`) and junk-drawer names
   (`helpers`/`utils`/`misc`).
4. **Units in the name, not a comment.** Numeric quantities carry their unit in the field name
   (`windSpeedKn`, `visibilityMiles`, `daylightDurationSeconds`). Flag a bare `visibility`/
   `precipitation`/`duration`. Flag any unit baked into a *string* value (breaks comparisons).
5. **Descriptive field names.** `sunriseTime` not `sunrise`. Names say what the value *is*.
6. **One timestamp format.** All datetime fields are full ISO 8601 with the site UTC offset.
   Flag offset-less local strings (`new Date()` would parse them in the browser's zone).
7. **No magic strings/numbers.** Literals like `'kn'`, `'imperial'`, `1609.344` must be named
   constants.
8. **Verified against the live system.** Data-layer changes that touch units/params must be
   smoke-tested against the real endpoint, not just unit tests on assumed-unit fixtures. If the
   diff changes request params, check for unit side effects (e.g. `precipitation_unit=inch`
   flips forecast `visibility` to feet). Note if a live check is missing.

## Output

Report findings grouped by severity, each as `path:symbol — problem → fix`:

- **🔴 Must fix** — shaping/conversion that belongs in the data layer leaking into the UI,
  wrong units, magic values driving behavior, an unverified unit change.
- **🟡 Should fix** — incohesive modules / misgrouped config, wrong or non-descriptive names,
  stutter/junk-drawer names.
- **🟢 Nits** — minor polish.

End with a one-line verdict: **Meets the bar** / **Fix the 🔴 first**. If everything is clean,
say so plainly — don't invent findings.

Then ask whether to apply the fixes. If yes, fix the smallest-blast-radius items first.
