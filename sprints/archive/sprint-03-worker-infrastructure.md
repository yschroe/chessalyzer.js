# Sprint 03 — Worker infrastructure

**Effort:** Medium (2–3 sessions)  
**Impact:** Medium — reliability for custom trackers and small-file perf  
**Depends on:** Sprint 01 recommended (buffer fix, maxGames cleanup)

## Goal

Harden the worker tracker registry, add lazy worker creation, and prepare for Sprint 04 (legacy MT collapse).

## Tasks

- [ ] **Replace constructor.name lookup with stable tracker IDs**
    - Problem: `tracker.constructor.name` breaks under minification.
    - Options (pick one):
        - **A)** Static `trackerId` on each tracker class (built-ins register in registry)
        - **B)** Explicit `registerTracker(id, Class)` API on main thread + serializable id in `trackerData`
    - Files: [`src/core/worker-tracker-registry.ts`](../src/core/worker-tracker-registry.ts), [`src/core/analysis-config.ts`](../src/core/analysis-config.ts)

- [ ] **Fail loudly on unknown tracker**
    - Replace silent `if (!TrackerClass) continue` with throw at worker init or first batch.
    - Include tracker id/name in error message.

- [ ] **Remove `getCachedCfg` fallback to index 0**
    - Invalid `idxConfig` should throw, not silently use config 0.
    - File: [`src/core/worker-tracker-registry.ts`](../src/core/worker-tracker-registry.ts)

- [ ] **Document custom tracker contract (post-v4)**
    - Separate module, default export, `static workerModule = import.meta.url`
    - Implement `merge()` for MT
    - Update README custom tracker section if registration API lands
    - File: [`README.md`](../README.md)

- [ ] **Lazy worker pool creation**
    - Don't spawn `availableParallelism()` workers in constructor.
    - Create on first `runTask`; cap at configured `workerCount`.
    - Listed in CHANGELOG [Unreleased] ideas.
    - File: [`src/core/worker-pool.ts`](../src/core/worker-pool.ts)

- [ ] **Optional: send tracker config once per worker**
    - Today tracker metadata may be redundant across batches — audit what's sent per `runTask` vs init.
    - File: [`src/core/worker-pool.ts`](../src/core/worker-pool.ts), [`src/core/chess-worker.ts`](../src/core/chess-worker.ts)

- [ ] **Integration test: custom tracker via `workerModule`**
    - Use [`manual-tests/custom-game-tracker.ts`](../manual-tests/custom-game-tracker.ts) in CI-style test (workers enabled, small fixture).
    - File: new `test/integration/custom-tracker.test.ts`

## Files (primary)

| File                                  | Change                                    |
| ------------------------------------- | ----------------------------------------- |
| `src/core/worker-tracker-registry.ts` | Stable IDs, no silent skip                |
| `src/core/worker-pool.ts`             | Lazy worker spawn                         |
| `src/core/analysis-config.ts`         | Serialize tracker id not constructor.name |
| Built-in trackers                     | Static `trackerId` if option A            |

## Done when

- Custom tracker test passes in multithreaded mode.
- Unknown tracker throws clear error at worker startup.
- Small PGN + default MT does not spawn full CPU worker count upfront (measure startup time).
- No `getCachedCfg` silent fallback.

## Verification

```bash
npm test
npm run typecheck
# Manual: run custom-game-tracker against small fixture with workers enabled
```

## Notes for Sprint 04

Registry improvements here make it easier to pass filter/limit state to workers without re-encoding PGN.
