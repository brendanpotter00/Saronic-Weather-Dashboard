---
name: review-loop
description: >-
  Iteratively review a PR (or the current branch / working-dir diff) and fix what's found, in a
  loop: a fresh agent reviews everything with /brendan-review plus an xhigh correctness pass, a
  second agent implements the fixes, and the cycle repeats until a review pass comes back clean —
  confirmed by an adversarial reviewer. Use when asked to "review loop", "review until clean",
  "iterate review and fix", "loop review on this PR", or to harden a change before landing.
  Runs unattended with sensible defaults; overridable via args.
---

# Review loop

Drive a change to a clean review bar by **looping** independent review and fix agents until a
review pass finds nothing that must change — then confirm that verdict with a hostile reviewer
before declaring done. This is the orchestration layer on top of [`brendan-review`](../brendan-review/SKILL.md):
`brendan-review` judges one snapshot; `review-loop` repeats review→fix→re-review to convergence.

The core lesson this skill encodes: **a single "clean" verdict is not trustworthy.** A first
reviewer can rubber-stamp code that a second, adversarial reviewer breaks in one counterexample.
So every clean verdict is confirmed by a fresh hostile pass before the loop ends.

## Defaults and overrides

Runs unattended with these defaults. Override by passing `key=value` args (e.g.
`/review-loop 3 cap=3 push=no`).

| Arg | Default | Meaning |
| --- | --- | --- |
| *(positional)* `target` | current branch vs base | `<PR#>` or PR URL → that PR; `local` → uncommitted working-dir diff; omitted → `<base>...HEAD`. |
| `base` | `main` (or the PR's base) | Base branch the diff is taken against. |
| `cap` | `5` | Max review→fix cycles. If not converged at the cap, stop and report what remains. |
| `stop` | `must-and-should` | Convergence bar: `must-and-should` (no 🔴/🟡; 🟢 nits don't block), `must-only` (no 🔴), or `zero` (no findings at all, incl. nits). |
| `push` | `yes` | `yes` → push the accumulated commits once at the end; `no` → commit locally only, never push. |
| `adversarial` | `on` | `on` → confirm every clean verdict with a hostile pass (recommended); `off` → trust a single clean verdict. |

## Resolve the target

1. **PR number/URL** (`target` is numeric or a GitHub URL): ensure that PR's head branch is
   checked out (`gh pr checkout <n>` if not already on it) and `base` is its base branch
   (`gh pr view <n> --json baseRefName`). The review range is `git diff <base>...HEAD`.
2. **`local`** (or the working tree is dirty and no PR was named): review the **uncommitted**
   changes — `git diff`, `git diff --staged`, and new untracked files under `src/`.
3. **Default** (clean tree, feature branch): review `git diff <base>...HEAD`.

A clean working tree on a feature branch means `<base>...HEAD` *is* the PR diff — reviewing that
range reviews the PR.

## The loop

```
iteration = 1
while iteration <= cap:
    # REVIEW PHASE — a FRESH agent each pass (no memory of prior findings → no rubber-stamp)
    findings = review pass over the target diff   (see "Review agent brief")

    if findings clear the `stop` bar:
        if adversarial == on:
            confirm = hostile review pass over the same diff   (see "Adversarial brief")
            if confirm also clears the bar:  break   # CONVERGED
            else: findings = confirm                 # the hostile pass found something — fix it
        else:
            break                                    # CONVERGED

    # FIX PHASE — a SEPARATE agent implements the findings  (see "Fix agent brief")
    apply fixes (smallest blast radius first); verify; commit one commit naming the findings
    iteration += 1

if push == yes and there are new commits:  git push   (single push at the end)
report the loop trace + final verdict   (see "Report")
```

Re-review the **full target diff every pass**, not just the last fix — a fix can introduce a new
problem, and a fresh reviewer judging the whole change cold is the point.

## Review agent brief

Spawn a fresh general-purpose agent (Opus) per review pass. It is **report-only** — must not
edit, commit, or push. Give it:

- The repo root, the target diff range, and the instruction to read **every changed file in
  full** (not just hunks), plus the root `CLAUDE.md` ("Code & naming conventions", and for this
  project "Tara's thresholds", "Data layer", "Status logic — worst factor wins").
- **Run the `/brendan-review` skill** scoped to the target range, and fold its findings in.
- Apply an additional **xhigh-effort correctness/bug lens** over the same diff: logic errors,
  edge cases, boundary/off-by-one (`<` vs `<=`), unit handling, NaN/undefined propagation,
  fail-safe gates, dead code, unused exports, `any`/unsafe casts, mutation bugs.
- It may pull in other skills when a category warrants it (e.g. `/investigate` for a real
  root-cause bug) — `/brendan-review` + the correctness lens are the backbone.
- **Output contract** (so the loop can branch on it): findings grouped by severity, each line
  `path:symbol — problem → concrete fix`:
  - 🔴 Must fix — correctness bugs, wrong units, shaping/conversion leaking above the data layer,
    magic values driving behavior, an unverified unit change.
  - 🟡 Should fix — incohesive modules / misgrouped config, wrong or non-descriptive names,
    folder stutter, junk-drawer names.
  - 🟢 Nits — minor polish.
  - Tell it not to invent findings (say so if a category is clean) and to ignore issues a
    linter/typechecker would catch and bare coverage gaps unless `CLAUDE.md` requires them.
  - End with EXACTLY one verdict line: `VERDICT: CLEAN — no 🔴/🟡 findings` **or**
    `VERDICT: CHANGES NEEDED — N 🔴, M 🟡` (with counts). Parse this line to decide the branch.

### Adversarial brief (the confirmation pass)
Same as above but framed hostilely: "Two reviewers (or the prior pass) called this clean —
**disprove it.** Construct an input that yields a wrong output, or cite a specific `CLAUDE.md`
rule the diff breaks. Be honest: if after a genuine hard look it's clean, say so — do not
manufacture findings." Same severity format and verdict line.

## Fix agent brief

Spawn a separate general-purpose agent (Opus) with edit access. Give it the consolidated,
deduped findings (🔴 first, then 🟡; skip 🟢 unless `stop=zero`) and tell it to:

- Apply fixes **smallest blast radius first**; change only what the findings name.
- **Verify** before committing — all must pass:
  ```bash
  npm run build
  npm run lint
  npx vitest run --exclude='**/worktrees/**'
  ```
  The `--exclude='**/worktrees/**'` matters: a stale `.claude/worktrees/` worktree can otherwise
  get globbed by vitest and produce unrelated failures. (If no such worktree exists, the flag is
  harmless.) Don't regress the test count or the coverage gate.
- **Commit** on the current branch — one commit per pass, message naming the findings addressed,
  ending with the repo's `Co-Authored-By` trailer. **Do not push** (the loop pushes once at the
  end if `push=yes`).
- Report back the diff, the passing build/lint/test signal, and the commit hash.

Before dispatching a fix, the orchestrator should read the implicated files itself to confirm
the finding is real and the proposed fix is sound — review agents occasionally over- or
under-call. Drop false positives; don't fix them.

## Report

When the loop ends, report:

- A **loop-trace table** (pass → agent role → result), e.g. which pass found what and which
  commit fixed it.
- The **fixes applied**, each as the problem and the resolution, with commit hashes.
- The **final verdict** (converged vs cap-hit) and any 🟢 nits left as optional.
- The **final local verification** (build/lint/test) and, if pushed, the push result.

If the cap was hit without converging, push what's committed (when `push=yes`) and list the
still-open 🔴/🟡 for the user to decide.

## Notes

- **Fresh agent every pass.** Reusing a review agent's context invites it to defend its earlier
  verdict. New context each pass = a cold judgment.
- **Commit per pass, push once.** Per-pass commits keep the history legible and bisectable;
  a single end-of-loop push triggers CI once and keeps the PR clean.
- **Don't push until converged.** Pushing is outward-facing (updates the PR, runs CI) — hold it
  to the end unless `push=no`.
- **Watch for layer-seam bugs.** The defects this loop tends to surface live *between* layers —
  a wrong assumption about what a lower layer guarantees, or a tree that silently narrows the
  contract beneath it — not inside a single function. The "shape data at the lowest level, keep
  consumers dumb" rule only holds if every layer faithfully carries forward what the one below
  it guarantees.
- Additive commits only — no force-push or history rewrite.
