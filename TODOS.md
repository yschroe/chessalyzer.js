# TODOs

Deferred follow-ups discovered during the v4 beta API freeze review. Not blocking release unless noted otherwise.

---

## Replay: stale `fromBuf` in `resolvePawnMove` (non-critical)

**Discovered:** 2026-08 — API freeze review (Topic 8.4 / non-null action piece fields).

**Files:** [`src/replay/san-resolver.ts`](src/replay/san-resolver.ts) (`resolvePawnMove`), [`src/replay/san-context.ts`](src/replay/san-context.ts) (`fromBuf` reuse), [`src/replay/san-decoder.ts`](src/replay/san-decoder.ts) (`requirePiece` guard added as interim fix).

**Problem:** For non-capture pawn moves, `resolvePawnMove` scans up to two squares behind the target for a pawn. If none is found, `from` is left unchanged — `ctx.fromBuf` is reused across half-moves, so it may still hold the **previous move's origin**. Downstream:

- If the stale square is **empty**, `requirePiece` now throws `IllegalMove` (good — game is skipped / aborted).
- If the stale square is **occupied**, decode can succeed with the **wrong** `MoveAction.piece` / capture fields and stats skew silently (bad).

Pawn **captures** set `from` arithmetically and are unaffected. The failure mode is malformed or edge-case pawn **quiet** moves on dirty PGN.

**Suggested fix:** Add a `found` (or similar) flag on `PawnResolution`; if the scan finds no pawn, throw `ReplayFailure('IllegalMove', …)` before building actions. Mirror any fix on the `SanApplier` board path if it shares the same resolver.

**Verify:** Unit test with a quiet pawn SAN whose origin cannot be resolved (no pawn on file within two ranks). Run `bun run bench:perf skip,board,actions` — hot path touches pawn resolution.

**Priority:** Low — trusted Lichess exports rarely hit this; abort/skip-game paths are mostly protected after the `requirePiece` guard.
