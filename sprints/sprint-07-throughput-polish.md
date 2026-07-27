# Sprint 07 — Throughput polish

**Effort:** Medium (2–3 sessions)  
**Impact:** High — structural perf wins without public API changes  
**Depends on:** Sprint 06 (done)

## Goal

Squeeze the existing `analyzePGN` pipeline: parse once per chunk for multi-run, defer worker result merge, optional bench hygiene.

## Tasks

- [ ] **Multi-run parse-once**
    - Today `runs: [...]` dispatches N analysis passes per chunk
    - Assemble once per chunk; apply filters/trackers/replay per run on workers or main
    - Files: [`src/core/game-processor.ts`](../src/core/game-processor.ts), [`src/core/chess-worker.ts`](../src/core/chess-worker.ts)

- [ ] **Defer worker→main result merge**
    - Merge tracker state once at pool drain instead of per batch (CHANGELOG Unreleased idea)
    - Measure with `npm run bench:perf`
    - Files: [`src/core/tracker-merge.ts`](../src/core/tracker-merge.ts), [`src/core/worker-pool.ts`](../src/core/worker-pool.ts)

- [ ] **Optional: iterator exploratory bench**
    - Restore or replace missing async-generator vs manual-iterator comparison for AGENTS claims
    - File: `bench/exploratory/`

## Done when

- Multi-run on a large fixture is measurably faster than N× single-run parse cost.
- Deferred merge bench numbers documented (enable or revert with rationale).

## Verification

```bash
npm test
npm run bench:perf
```

## Explicitly not doing

- Rewriting `SanApplier` / movetext tokenizer regex
- Public API changes
