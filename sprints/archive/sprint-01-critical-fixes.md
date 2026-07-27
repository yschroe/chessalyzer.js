# Sprint 01 — Critical fixes & quick wins

**Effort:** Small (1–2 sessions)  
**Impact:** High — fixes a latent bug and removes user-facing debug noise

## Goal

Fix the multi-run worker-parse buffer bug, remove debug logging from library code, and clean up obvious dead or stale artifacts.

## Tasks

- [ ] **Fix shared chunk buffer transfer across configs**
    - In `processPGNWithWorkerParse`, the same `chunk.bytes` is posted to multiple workers with `[pgnChunkBytes.buffer]` transfer — second dispatch gets a detached buffer.
    - Fix: clone chunk bytes per config dispatch (e.g. `chunk.bytes.slice()` → new `Uint8Array`), or clone once per chunk × config count.
    - File: [`src/core/game-processor.ts`](../src/core/game-processor.ts), [`src/core/worker-pool.ts`](../src/core/worker-pool.ts)

- [ ] **Add regression test for worker-parse multi-run**
    - `analyzePGN(path, { runs: [{ trackers: [t1] }, { trackers: [t2] }] })` with no filter / no `maxGames`.
    - Assert both runs process games and tracker state is non-zero.
    - File: new or extend [`test/integration/fixtures.test.ts`](../test/integration/fixtures.test.ts)

- [ ] **Remove debug logging from `GameReplayer`**
    - Delete `console.log(game)` and `board.printPosition()` in the catch block.
    - Optional: gate behind `process.env.CHESSALYZER_DEBUG_REPLAY` if replay diagnostics are still useful during dev.
    - File: [`src/replay/game-replayer.ts`](../src/replay/game-replayer.ts)

- [ ] **Remove or wire dead `WorkerTaskData.maxGames`**
    - Worker reads it in `chess-worker.ts`; main thread never sends it.
    - Either send from `GameProcessor` when relevant, or remove from [`src/types/worker.ts`](../src/types/worker.ts) and worker handler.
    - Files: [`src/core/chess-worker.ts`](../src/core/chess-worker.ts), [`src/core/game-processor.ts`](../src/core/game-processor.ts)

- [ ] **Update stale doc references**
    - `IDEAS.md`: `chessalyzer.ts` → `analyze.ts`, `path` → `workerModule`
    - `test/README.md`: "Chessalyzer pipeline" → `analyzePGN` pipeline
    - Files: [`IDEAS.md`](../IDEAS.md), [`test/README.md`](../test/README.md)

## Files (primary)

| File                          | Change                    |
| ----------------------------- | ------------------------- |
| `src/core/game-processor.ts`  | Buffer clone per config   |
| `src/replay/game-replayer.ts` | Remove debug logs         |
| `src/types/worker.ts`         | Wire or remove `maxGames` |
| `test/integration/*.test.ts`  | Multi-run regression      |

## Done when

- Multi-run on worker-parse path passes without buffer errors.
- No `console.log` / `console.error` in replay hot path (except optional debug flag).
- `maxGames` on worker task is either functional or removed.
- Stale doc references updated.

## Verification

```bash
npm test
npm run typecheck
npm run lint
# Optional: npm run bench:perf (should be unchanged — clone cost is negligible vs parse)
```
