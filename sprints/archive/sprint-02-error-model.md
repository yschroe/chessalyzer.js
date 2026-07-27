# Sprint 02 — Error model & resilience

**Effort:** Medium (2–3 sessions)  
**Impact:** High — production batch runs need per-game isolation, not whole-file abort  
**Depends on:** Sprint 01 (debug logging removal) recommended first

## Goal

Replace library `console.error` + generic rethrow with typed errors and a configurable error policy (`abort` vs `skip-game`).

## Tasks

- [ ] **Define public error types**
    - `AnalyzeError` base with `code`, `message`, optional `cause`
    - `ReplayError` / `ParseError`: `{ gameIndex, moveIndex?, san?, reason }`
    - Reasons: `IllegalMove`, `AmbiguousSan`, `UnknownToken`, etc. (start minimal)
    - File: new `src/types/errors.ts`, export from [`src/index.ts`](../src/index.ts)

- [ ] **Remove side-effect logging from `analyzePGN`**
    - Delete `console.error` block in [`src/core/analyze.ts`](../src/core/analyze.ts)
    - Rethrow typed error; fix typo "unkown" if any message remains
    - Callers decide how to log

- [ ] **Add `onError` to `AnalyzeOptions`**

    ```ts
    onError?: 'abort' | 'skip-game'; // default: 'abort' (preserve today)
    ```
    - `'abort'`: current behavior — first failure stops the run
    - `'skip-game'`: log/collect error, continue with next game
    - File: [`src/types/analysis.ts`](../src/types/analysis.ts), propagate through processor/replayer

- [ ] **Implement skip-game in `GameReplayer`**
    - Wrap per-game replay in try/catch
    - On failure: increment skip counter, optionally push to `result.errors[]`
    - Do not corrupt board state — `reset()` between games already exists
    - File: [`src/replay/game-replayer.ts`](../src/replay/game-replayer.ts)

- [ ] **Extend `AnalyzeResult` with optional error summary**

    ```ts
    skippedGames?: number;
    errors?: AnalyzeError[]; // cap length for huge files, e.g. first 100
    ```
    - Only populated when `onError: 'skip-game'` or partial failure occurs

- [ ] **Worker path: per-game isolation**
    - Worker batch should not abort entire chunk on one bad game when policy is `skip-game`
    - Return partial counts + error list in `WorkerMessage`
    - Files: [`src/core/chess-worker.ts`](../src/core/chess-worker.ts), [`src/types/worker.ts`](../src/types/worker.ts)

- [ ] **Document error policy in README**
    - When to use `abort` vs `skip-game`
    - Lichess dumps vs untrusted input

## Files (primary)

| File                          | Change                         |
| ----------------------------- | ------------------------------ |
| `src/types/errors.ts`         | New error types                |
| `src/types/analysis.ts`       | `onError`, result fields       |
| `src/core/analyze.ts`         | No console.error               |
| `src/replay/game-replayer.ts` | Policy-aware per-game handling |
| `src/core/game-processor.ts`  | Propagate policy to workers    |
| `README.md`                   | Error policy docs              |

## Done when

- Default behavior unchanged (`abort` on first bad game).
- `onError: 'skip-game'` processes remaining games and returns counts + error summary.
- No library-initiated `console.error` on failure paths.
- Integration test: corrupt fixture or intentionally bad SAN continues when policy is `skip-game`.

## Verification

```bash
npm test
npm run typecheck
# Add test/fixtures or inline PGN with one bad game mid-file
```

## Out of scope (later)

- Validate mode (legal move generation) — see `IDEAS.md`
- `skip-move` policy
- Structured error streaming for huge files
