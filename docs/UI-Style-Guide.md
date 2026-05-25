# UI Style Guide — the design system

The shared visual vocabulary for the dashboard. **Pull from the tokens; don't reinvent them.**
The code source of truth is `src/theme/theme.ts` (the MUI theme) and `src/theme/statusColor.ts`
(the domain→colour map). This doc explains how to consume them; if a value here and the code
ever disagree, the code wins — update this doc.

## The rule

- **No magic px or hex in components.** Spacing comes from `theme.spacing()` (the `sx` shorthand
  `p`, `m`, `gap`, etc. are already in spacing units). Colours come from the palette. Type sizes
  come from `variant=`. If you're typing a raw `#hex` or `14px` in a component, stop — add or use
  a token.
- **Status colour comes from one place.** Never hardcode green/amber/red. Map the domain `Status`
  through `STATUS_TO_PALETTE` (`src/theme/statusColor.ts`) and let MUI resolve it.

## Styling: `sx` by default, `styled()` when it turns conditional

Default to inline `sx` — it keeps styling next to the element. But when a component's styling
branches on props or state (a candidate band, a selection ring, a status tint), packing those
ternaries into an `sx={(theme) => {…}}` callback buries the JSX. At that point lift the styling
into a `styled(Component)` defined above the component, driven by explicit boolean/enum props:

- Keep pulling tokens — `theme.palette`, `theme.spacing()`, `theme.shape.borderRadius`, `alpha()`,
  `STATUS_TO_PALETTE`. `styled()` changes *where* the conditional lives, not the no-magic-px/hex rule.
- Filter custom props with `shouldForwardProp` so they don't leak onto the DOM (React warns on
  unknown attributes).
- The JSX should then read as plain markup with state passed as props.

Canonical examples: `DayColumn` (`DayCell`) and `HourRow` (`HourRowRoot`). Everything else stays on `sx`.

## Palette — black & white + status (light)

Defined in `src/theme/theme.ts`. The base is near-monochrome so the *only* saturated colour in
the UI is status — that's what the eye should catch.

| Token | Value | Use |
| --- | --- | --- |
| `background.default` | `#fafafa` | page canvas |
| `background.paper` | `#ffffff` | cards / surfaces |
| `text.primary` | `#0a0a0a` | primary ink |
| `text.secondary` | `#5c5c5c` | labels, captions, hints |
| `divider` | `#e0e0e0` | hairlines, outlined-card borders |
| `primary.main` | `#0a0a0a` | monochrome accent (selection outline) |
| `success.main` | `#2e7d32` | **GO** |
| `warning.main` | `#ed6c02` | **CAUTION** |
| `error.main` | `#c62828` | **NO-GO** |

### Status → colour mapping (`src/theme/statusColor.ts`)

```ts
STATUS_TO_PALETTE = { go: 'success', caution: 'warning', 'no-go': 'error' }
STATUS_LABEL      = { go: 'GO', caution: 'CAUTION', 'no-go': 'NO-GO' }
```

Usage patterns:
- MUI components that take `color`: `<Chip color={STATUS_TO_PALETTE[status]} />` (see `StatusBadge`).
- A raw surface via `sx`: `sx={{ bgcolor: \`${STATUS_TO_PALETTE[status]}.main\` }}` (see `HourLine`).
- Tinting a value, neutral when GO: `status === Status.Go ? 'text.primary' : \`${STATUS_TO_PALETTE[status]}.main\`` (see `FactorCell`).

## Typography

Use `variant=` — don't set `fontSize`. System font stack (no webfont, protects the <1s load).

| Variant | Role |
| --- | --- |
| `h1` | page title |
| `h2` | (rare) major heading |
| `h3` | stat values in cards |
| `body2` | body text, hints |
| `caption` | table cells, fine print |
| `overline` | the small uppercase eyebrow used for section labels and factor names |

## Spacing, shape, components

- **Spacing unit: 8px.** Use `sx` shorthands (`p`, `px`, `py`, `m`, `gap`, `spacing` on Stack).
  Multiples of the unit only — `p: 1.5` = 12px is fine; `padding: '13px'` is not.
- **Radius:** `theme.shape.borderRadius` (8). `borderRadius: 1` in `sx` = one unit.
- **Component defaults** (set in `theme.ts`, so you get them for free): `Container maxWidth="lg"`,
  `Card variant="outlined"` (flat, hairline border — colour comes from status, not shadows),
  `Button variant="outlined"` non-elevated, `Chip size="small"` bold label.

## MUI v9 gotcha

The standalone **system shorthand props were removed** — `fontWeight`, `justifyContent`,
`alignItems`, etc. must go inside `sx`, not as top-level props:

```tsx
// ✗ won't typecheck
<Stack justifyContent="space-between" alignItems="center">
<Typography fontWeight={600}>
// ✓
<Stack sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
<Typography sx={{ fontWeight: 600 }}>
```

Real component props stay top-level (`Stack` `direction`/`spacing`, `Typography` `variant`/`color`).

## Display formatting

All value→string formatting (units, "none", "—", clock/day labels) lives in
`src/dashboard/format.ts` — the one UI-side place for it. Don't `.toFixed()` or append units ad
hoc in a component; add/extend a formatter there so every cell formats identically. The data
layer keeps values as real numbers with the unit in the field name (e.g. `windSpeedKn`); turning
them into strings is the UI's job and stays in `format.ts`.

## Responsiveness

Lean on MUI breakpoints via responsive `sx` arrays/objects (`{ xs, sm, md }`) and `Stack`
`direction={{ xs: 'column', sm: 'row' }}` — not custom media queries. The horizon line scrolls
horizontally on phones so each day's line stays legible.
