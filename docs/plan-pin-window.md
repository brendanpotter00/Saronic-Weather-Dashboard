# Implementation plan — pin a demo window

Status: **built.** Reference prototype: `docs/prototype-window-pin.html`.

## Context

Tara's highest-ROI deferred feature (`docs/Notes.md` #4, "Save a time window"): pin a concrete
demo window to the top of the dashboard and watch its go/no-go status firm up each morning as the
date approaches. She picks a window ~10 days out, pins it, and glances at it daily to see the trend.

The shipped app already has the seam: `PinnedWindowSlot` is a reserved empty slot at the top
(`Dashboard.tsx`), `WindowControls` fixes a dashboard-wide **demo length** (`DEMO_WINDOW_HOURS = 6`),
and scoring computes the *best achievable* tier but deliberately never names a block — naming the
block is the human's call, which is exactly what pinning is (`UI-Architecture.md` seam #2).

## Chosen interaction — centered hover

Decided with Brendan after feeling all three options in the prototype:

- The demo **length is fixed**, so picking a window is just choosing **where it sits**. Tara points
  at the middle of the stretch she wants; the fixed-length block **centers on the hovered hour**.
- **Lean later:** with an even length there's no exact center, so the hovered hour sits
  `floor((len-1)/2)` hours into the block (2 before / 3 after for a 6h demo).
- **Clamp at dawn/dusk:** near the edges the block clamps to the earliest/latest valid window
  instead of disabling rows — every row stays pinnable, no dead zones.
- **Status-tinted preview:** the highlighted block tints by its rolled-up go/no-go status on hover
  (the only saturated colour in the UI), so Tara sees whether the window holds up *before* she
  commits. Click/tap → confirm dialog → pins to the top.
- Hover is desktop-only, so the **commit is always click/tap → confirm**; it degrades to touch.

## Implementation (low → high, so the frontend stays dumb)

### 1. Scoring layer — `src/scoring/window.ts` (do first, unit-tested)

- **`centeredWindowStart(hoveredHour, lengthHours, bounds: AvailableWindow): number | null`**
  `start = hoveredHour - Math.floor((lengthHours - 1) / 2)`, clamped to
  `[bounds.startHour, bounds.endHour - lengthHours + 1]`. Returns `null` only when the day has fewer
  than `lengthHours` daylight hours. The single piece of selection math — kept in the domain layer.

- **`scoreNamedWindow(day: ScoredDay, startHour, lengthHours): NamedWindowScore`**
  Rolls the contiguous block up to one status with the existing `worstTier` / `STATUS_TO_TIER`, and
  returns worst-in-window readings per factor. Reuses `clockHour`, the threshold scorers, and the
  `ScoredHour` records already on the day.
  ```ts
  interface NamedWindowScore {
    startTime: string; endTime: string;      // ISO with site offset, for display
    status: Status;                            // worst hour in the block
    factors: Record<Factor, ScoredFactor>;     // worst-in-window value per factor
    limitingFactors: Factor[];
    complete: boolean;                         // false → status forced no-go (fail-safe)
  }
  ```
  Because it reads from the memoized `scored` forecast, the pinned card **re-scores on every
  refetch** — that delivers "watch it firm up each morning" with no card-level logic.

### 2. Dashboard state — `src/dashboard/Dashboard.tsx`
```ts
const [pinnedWindow, setPinnedWindow] = useState<{ date: string; startHour: number } | null>(null);
```
Length is derived (`scored.demoWindowHours`), not stored. Pass `pinnedWindow` and the matching
`ScoredDay` (`scored.days.find(d => d.date === pinnedWindow.date)`) into `PinnedWindowSlot`.

### 3. Selection — `src/dashboard/components/DayDetail.tsx` + `HourRow.tsx`
- Local `hoverStartHour` state in `DayDetail`; row `onMouseEnter`/`onFocus` →
  `centeredWindowStart(hour, len, day's daylight bounds)`; clear on table `onMouseLeave`.
- `HourRow` gains `inSelection` + `selectionStatus` props → tints via `STATUS_TO_PALETTE` and draws
  the bracket on first/last rows (reuses the existing dimming + `HOUR_GRID` machinery).
- Row `onClick` (mouse + tap) opens the confirm dialog. Hover is progressive enhancement only.

### 4. `PinConfirmDialog` (new — MUI `Dialog`)
Day label, window range (`formatClockTime`), status word (`STATUS_LABEL`), four worst-in-window
readings (reuse `FactorCell`), **Pin** / **Cancel**. Pin → `setPinnedWindow(...)`.

### 5. `PinnedWindowSlot` → pinned card
Fills the reserved slot: status strip + word, factor cells, day, range, a **days-out** line,
**Edit** (reopen dialog) / **Unpin**. No layout shift.

## Decisions locked
- Centering: lean-later; clamp at dawn/dusk (no dead rows).
- Fail-safe: incomplete day / window → no-go, surfaced (consistent with the marine-unavailable banner).
- Out of scope (stated): persistence (picture it DB-saved), multiple simultaneous pins (slot is
  singular), recommending/auto-picking a window.

## Tests
- Unit: `centeredWindowStart` (lean-later, both-edge clamp, too-short → null);
  `scoreNamedWindow` (worst-factor roll-up, incomplete → no-go).
- Component: selection highlight follows the cursor; click → dialog → pin → card; Unpin clears.

## Verification (end to end)
- `npm run dev`, open a day's detail, hover the hourly rows: a fixed-length block centers on the
  cursor and tints by status; dawn/dusk hovers clamp to the first/last window.
- Click a row → confirm dialog with the right window + rolled-up status → Pin → card appears at the
  top with day, range, status word, factors, days-out; Unpin clears it.
- Confirm the card re-scores on refetch (mock a forecast change in the scoring test).
- `npm run lint` and `npm test` clean; mobile layout holds (tap-to-confirm works without hover).

## Shipped changes (post-plan)

Decided with Brendan during implementation; supersede the matching lines above:

- **Pinned length is frozen, not derived.** A pin captures the demo length it was committed at
  (`pinnedWindow: { date, startHour, lengthHours }`); changing the dashboard-wide demo length no
  longer reshapes an already-pinned window — a scheduled window is its own independent window. The
  confirm dialog's preview still uses the live demo length.
- **No Edit button.** Re-pinning from the day detail replaces the pin; the card only offers Unpin.
- **No days-out / T-minus line** on the card (and `daysUntil` was dropped as dead code).
- The card eyebrow reads **"Pinned demo window."**
