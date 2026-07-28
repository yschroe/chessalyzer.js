# Sprint 07 — Throughput polish

**Status:** Completed (2026-07)

**Effort:** Medium (2–3 sessions)  
**Impact:** High — structural perf wins without public API changes  
**Depends on:** Sprint 06 (done)

## Goal

Squeeze the existing `analyzePGN` pipeline: parse once per chunk for multi-run, defer worker result merge, optional bench hygiene.

## Tasks

- [x] **Multi-run parse-once**
    - Today `runs: [...]` dispatches N analysis passes per chunk
    - Assemble once per chunk; apply filters/trackers/replay per run on workers or main
    - Files: [`src/core/game-processor.ts`](../../src/core/game-processor.ts), [`src/core/chess-worker.ts`](../../src/core/chess-worker.ts)

- [x] **Defer worker→main result merge**
    - Merge tracker state once at pool drain instead of per batch (CHANGELOG Unreleased idea)
    - Measure with `npm run bench:perf`
    - Files: [`src/core/tracker-merge.ts`](../../src/core/tracker-merge.ts), [`src/core/worker-pool.ts`](../../src/core/worker-pool.ts)

## Done when

- Multi-run on a large fixture is measurably faster than N× single-run parse cost.
- Deferred merge bench numbers documented (enable or revert with rationale).

## Bench results (2026-07, Node v26, M-series, 2× Lichess 2014-09)

| Scenario                                                 | Result                                          |
| -------------------------------------------------------- | ----------------------------------------------- |
| `bench:perf` multithreaded (GameTracker, default)        | mean **7.35 s**, CV **2.7%**, **18.4M moves/s** |
| Multi-run vs 2× separate (`GameTracker` + `TileTracker`) | **0.87×** wall time (19.8 s vs 22.8 s)          |

Deferred merge **shipped** — per-batch posts counts/errors only; tracker payloads flush once at pool drain.

## Verification

```bash
npm test
npm run bench:perf
```

## Explicitly not doing

- Rewriting `SanApplier` / movetext tokenizer regex
- Public API changes
