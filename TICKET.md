# tileTracker / pieceTracker — Type & API Improvements

Rename the tile-tracker type surface to use `Square` terminology, switch the
public state from an opaque 2-D array to a `Record<Square, SquareStats>`, clean
up the `stripRuntimeScratch` type-cast pattern, align `pieceTracker` with
`tileTracker`'s public factory shape, and add a doc comment to `PieceStatsMap`.

No new counters are introduced. The internal array representation stays intact
for performance; only the publicly visible output shape changes.

---

## Open Questions

> [!IMPORTANT]
> **`b` / `w` color keys on `SquareStats`** — the review flagged them as opaque.
> Should `b` / `w` be renamed to `black` / `white` in the tile tracker's public
> state? This would cascade into `TileColorStats` (renamed `PlayerSquareStats`),
> all heatmap presets, and possibly the `PlayerColor` type in `src/types/tokens.ts`.
> Recommendation: keep `b` / `w` for now (they are typed as `PlayerColor` so
> editors show the full union; renaming `PlayerColor` is a separate concern).
> **Please confirm before executing.**

> [!IMPORTANT]
> **`MoveCoords` export** — it lives in `tile-tracker-types.ts` and is already
> re-exported from `chessalyzer/trackers`. Should it be moved to `src/types/` as
> a general pipeline type? It is only used inside the tile tracker today, so
> leaving it in place (or removing the public export) seems correct, but call it
> out if you want it elevated.

---

## Proposed Changes

### 1. Type renames — `src/trackers/tile/tile-tracker-types.ts`

#### [MODIFY] [tile-tracker-types.ts](file:///Users/yannik/Documents/workspace/chessalyzer.js/src/trackers/tile/tile-tracker-types.ts)

| Old name         | New name                     | Rationale                                                     |
| ---------------- | ---------------------------- | ------------------------------------------------------------- |
| `TileStats`      | `SquareCounters`             | Plain counters, not "tile"-specific                           |
| `TileColorStats` | `PlayerSquareStats`          | Per-player, per-square — name describes both dimensions       |
| `TileCell`       | `SquareStats`                | Matches `Square` terminology; replaces "cell"                 |
| `TileGrid`       | _(removed)_                  | Replaced by `Record<Square, SquareStats>` on the public state |
| `TileRow`        | _(removed, was `type`-only)_ | No longer needed                                              |

`RuntimeTileGrid`, `RuntimeTileRow`, `StatsField` stay internal and unchanged.

`createTileStats` → `createSquareCounters` (internal factory, renamed for consistency).  
`createTileColorStats` → `createPlayerSquareStats` (internal, renamed).

---

### 2. Public state shape — `src/trackers/tile/tile-tracker.ts`

#### [MODIFY] [tile-tracker.ts](file:///Users/yannik/Documents/workspace/chessalyzer.js/src/trackers/tile/tile-tracker.ts)

**`TileTrackerState`** before:

```ts
export interface TileTrackerState {
    tiles: TileGrid; // 8×8 nested tuple, index via tileAt(state.tiles, 'a2')
    movesTotal: number;
}
```

**`TileTrackerState`** after:

```ts
export interface TileTrackerState {
    squares: Record<Square, SquareStats>; // direct: state.squares['a2']
    movesTotal: number;
}
```

**How it works at runtime:**

- `TileTrackerRuntimeState` keeps `tiles: RuntimeTileGrid` (the internal 8×8
  array) throughout parsing/merging — zero change to the hot path.
- `onFinish` replaces `stripRuntimeScratch` with an explicit conversion: iterate
  the `RuntimeTileGrid`, emit `{ b, w }` per square (naturally drops
  `currentPiece`), and store as `Record<Square, SquareStats>`. The result is
  attached to the state object, the internal `tiles` array is deleted. The
  existing unsafe cast on the `tileTrackerFactory` export covers this.

```ts
onFinish(state) {
    const squares = {} as Record<Square, SquareStats>;
    for (const row of BOARD_INDICES) {
        for (const col of BOARD_INDICES) {
            const cell = state.tiles[row][col];
            squares[squareAt(row, col)] = { b: cell.b, w: cell.w };
        }
    }
    (state as unknown as TileTrackerState).squares = squares;
    delete (state as Partial<TileTrackerRuntimeState>).tiles;
    delete (state as Partial<TileTrackerRuntimeState>).movesGame;
},
```

This is cleaner than the current `delete cell.currentPiece` loop because no
`Partial<StatsField>` cast is needed inside the cell loop; the `currentPiece`
field simply does not appear on the emitted `{ b, w }` literal.

> [!NOTE]
> `movesGame` deletion moves here from the old `stripRuntimeScratch` to keep
> `onFinish` as the single cleanup site.

---

### 3. Grid helpers — `src/trackers/tile/tile-grid.ts`

#### [MODIFY] [tile-grid.ts](file:///Users/yannik/Documents/workspace/chessalyzer.js/src/trackers/tile/tile-grid.ts)

- `addTileStats` → `addSquareCounters` (internal rename).
- `mergeCellStats` — parameter types updated to use renamed types; behavior unchanged.
- `tileAt(tiles: TileGrid, square)` — **removed from public surface** (no longer
  needed; callers use `state.squares[square]` directly). The internal helper
  `runtimeTileAt(tiles: RuntimeTileGrid, square)` stays unchanged.
- `createTileGrid`, `setStartingPiece` — internal, rename references only.

---

### 4. Heatmap presets — `src/trackers/heatmaps/tile-heatmaps.ts`

#### [MODIFY] [tile-heatmaps.ts](file:///Users/yannik/Documents/workspace/chessalyzer.js/src/trackers/heatmaps/tile-heatmaps.ts)

All presets currently call `tileAt(data.tiles, square)`. After this change they
become `data.squares[square]` (a direct property access — slightly simpler,
no import of `tileAt`).

```ts
// Before
const cell = tileAt(data.tiles, square);
if (!cell) return 0;

// After
const cell = data.squares[square];
if (!cell) return 0; // still handles the undefined case for safety
```

`TILE_OCC_BY_PIECE` uses `tileAt(data.tiles, target)` with a captured `target:
Square` — becomes `data.squares[target]`.

---

### 5. Public barrel — `src/trackers/index.ts`

#### [MODIFY] [index.ts](file:///Users/yannik/Documents/workspace/chessalyzer.js/src/trackers/index.ts)

- **Remove** `export { tileAt } from '#trackers/tile/tile-grid'` — no longer
  part of the public API.
- **Update** exported type names:

```ts
// Remove
export type { TileCell, TileColorStats, TileGrid, TileStats } from '…';

// Add
export type { SquareStats, PlayerSquareStats, SquareCounters } from '…';
// TileGrid is gone; Record<Square, SquareStats> is inlined on TileTrackerState
```

- `MoveCoords` stays exported (it is already there and is a useful utility type
  for custom trackers that track move coordinates).

---

### 6. pieceTracker factory alignment — `src/trackers/piece-tracker.ts`

#### [MODIFY] [piece-tracker.ts](file:///Users/yannik/Documents/workspace/chessalyzer.js/src/trackers/piece-tracker.ts)

`pieceTracker` is currently the raw `defineMoveTracker(…)` call, so its public
type is `MoveTrackerDef<PieceTrackerState>` — not a callable factory.
`tileTracker` wraps this in a `TrackerFactory` cast to give it a cleaner public
type that hides the internal runtime/options shape.

Apply the same pattern:

```ts
const pieceTrackerFactory = defineMoveTracker<PieceTrackerState>({ … });

export const pieceTracker = pieceTrackerFactory as TrackerFactory<
    PieceTrackerState,
    unknown,
    MoveTrackerDef<PieceTrackerState>
>;
```

Also add a JSDoc comment on `PieceStatsMap` clarifying the access order
(`state[takingColor][takingPiece][takenPiece]`).

---

### 7. `heatmap-types.ts` — doc example update

#### [MODIFY] [heatmap-types.ts](file:///Users/yannik/Documents/workspace/chessalyzer.js/src/trackers/heatmap-types.ts)

Update the JSDoc example that currently reads:

```ts
const cell = tileAt(data.tiles, square);
return cell ? cell.w.total.occupiedFor : 0;
```

to:

```ts
const cell = data.squares[square];
return cell ? cell.w.total.occupiedFor : 0;
```

---

### 8. Tests

#### [MODIFY] [tracker-merge.test.ts](file:///Users/yannik/Documents/workspace/chessalyzer.js/src/core/__tests__/tracker-merge.test.ts)

The merge test directly accesses `state.tiles[row][col]`. After the change this
will not compile — update to the runtime state form. The merge tests run _before_
`onFinish`, so they operate on `TileTrackerRuntimeState` which still has the
internal array.

Options:

- Access the internal tiles via a cast: `(state as any).tiles[4][4]…` — ugly.
- Expose a minimal `isTileTrackerRuntimeState` guard in test helpers.
- **Recommended:** move the merge test assertions to use the tracker's `merge`
  method directly on a raw state object (no array indexing through the public
  type), keeping the test decoupled from the internal representation.

#### [MODIFY] [tracker-state.ts](file:///Users/yannik/Documents/workspace/chessalyzer.js/test/helpers/tracker-state.ts)

Update `isTileTrackerState` guard: replace `'tiles' in value` with
`'squares' in value`.

---

### 9. Docs

#### [MODIFY] docs/examples/generate-outputs.ts

- Replace `tileAt(tiles.state.tiles, square)` → `tiles.state.squares[square]`
- Replace inline `tileAt(data.tiles, square)` → `data.squares[square]`
- Remove `tileAt` import

#### [MODIFY] docs/content/docs — affected MDX pages

Scan and update any `tileAt`, `TileGrid`, `TileCell`, `TileColorStats`,
`TileStats`, or `data.tiles` references. Expected files (from grep):

- `docs/content/docs/trackers/built-in.mdx`
- `docs/content/docs/heatmaps/custom-functions.mdx`
- `docs/content/docs/comparing-analyses.mdx`
- `docs/content/docs/quickstart.mdx`

---

## Verification Plan

### Automated Tests

```bash
bun run typecheck
bun run test:unit
bun run build && bun run test:integration
```

### Manual Verification

- Run `bun docs/examples/generate-outputs.ts` and verify output is unchanged.
- Spot-check `state.squares['e4']`, `state.squares['a2']` in a quick script
  against a small PGN.
