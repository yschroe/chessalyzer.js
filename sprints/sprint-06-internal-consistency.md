# Sprint 06 — Internal consistency & small perf wins

**Effort:** Small–Medium (1–2 sessions)  
**Impact:** Medium — contributor ergonomics and optional throughput for count-only runs  
**Depends on:** None (can run in parallel with Sprint 01)

## Goal

Align internal naming with the v4 public API, tidy types/exports, and enable opt-in replay skip after benchmarking.

## Tasks

### Naming & types

- [ ] **Unify game limit naming internally**
    - Public: `maxGames`
    - Internal today: `cntGames` in `GameProcessorConfig`, `cntReadGames`, `processedGames`
    - Rename runtime fields to `maxGames` / `readGames` / `processedGames` (or document mapping in `analysis-runtime.ts`)
    - Files: [`src/types/analysis-runtime.ts`](../src/types/analysis-runtime.ts), [`src/core/game-processor.ts`](../src/core/game-processor.ts), [`src/core/tracker-merge.ts`](../src/core/tracker-merge.ts)

- [ ] **Move `@internal` types out of public `analysis.ts`**
    - `AnalysisConfig`, `MultithreadConfig`, `GameAndMoveCount` → `analysis-runtime.ts` only
    - Integration tests import from runtime or test helpers, not `@internal` public file
    - File: [`src/types/analysis.ts`](../src/types/analysis.ts)

- [ ] **Clarify tracker file exports**
    - `game-tracker-base.ts` exports default `GameTracker` (concrete) — rename file to `game-tracker.ts` OR re-export clearly in index
    - Consider consistent named exports for built-ins (optional breaking change — defer to v5 if needed)

### Code duplication (safe)

- [ ] **Extract heatmap preset resolution in `BaseTracker`**
    - Duplicate block in `generateHeatmap` and `generateComparisonHeatmap` → private `resolveHeatmapFunc()`
    - File: [`src/tracker/base-tracker.ts`](../src/tracker/base-tracker.ts)
    - No perf impact — cosmetic

- [ ] **Extract fatal-error + worker pool lifecycle in `GameProcessor`**
    - Shared helper for `processPGNWithWorkerParse` and `processPGNOnMainThread` boilerplate
    - File: [`src/core/game-processor.ts`](../src/core/game-processor.ts)

### Replay skip (bench first)

- [ ] **Measure `SKIP_REPLAY_WITHOUT_MOVE_TRACKERS = true`**
    - Run `npm run bench:perf` on count-only runs (no trackers)
    - Document delta in CHANGELOG if enabling by default
    - File: [`src/replay/replay-policy.ts`](../src/replay/replay-policy.ts)

- [ ] **If bench wins are clear: enable skip by default**
    - Count-only runs skip board replay; move trackers still get `actions` policy
    - Update AGENTS.md replay policy section

### Known tracker TODO

- [ ] **Castling double-count in `TileTracker`**
    - `SanToActions.castle()` emits two move actions; tile tracker counts both
    - Fix in tracker or replay layer; add test in Sprint 05
    - File: [`src/tracker/tile/tile-tracker-base.ts`](../src/tracker/tile/tile-tracker-base.ts)

### Docs

- [ ] **AGENTS.md execution paths** — reflect v4 API + post-Sprint-04 path if done
- [ ] **IDEAS.md** — mark completed items, update `chessalyzer.ts` / `path` references

## Files (primary)

| File                            | Change                 |
| ------------------------------- | ---------------------- |
| `src/types/analysis-runtime.ts` | Counter rename         |
| `src/types/analysis.ts`         | Internal type move     |
| `src/tracker/base-tracker.ts`   | Preset helper          |
| `src/replay/replay-policy.ts`   | Skip replay default    |
| `src/core/game-processor.ts`    | Pool lifecycle extract |

## Done when

- Internal counter names documented or aligned with `maxGames`.
- `@internal` types not mixed in public analysis module.
- Heatmap preset duplication removed.
- Replay skip decision documented with bench numbers (enable or keep opt-in).

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run bench:perf   # if changing replay-policy default
```

## Explicitly not doing

- DRYing `SanApplier` / `SanToActions` — intentional perf split
- Changing hot-loop append patterns without atomic bench
