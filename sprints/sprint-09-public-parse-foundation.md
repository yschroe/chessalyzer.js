# Sprint 09 — Public parse foundation

**Effort:** Large (multiple sessions)  
**Impact:** High — foundation for IDEAS “PGN library” direction  
**Depends on:** Sprint 08 helpful but not required

## Goal

Split “parse PGN” from “run trackers” with a minimal public API — no validate mode or RAV trees yet.

## Tasks

- [ ] **Export `parsePGN` (or async iterator)**
    - Modes: `tokenize` | `parse` (no board replay)
    - Reuse [`GameAssembler`](../src/pgn/game-assembler.ts), [`readLinesFast`](../src/pgn/line-reader.ts), [`readPgnChunks`](../src/pgn/pgn-chunks.ts)

- [ ] **Public `ParsedGame` type**
    - Headers + mainline SAN + optional result
    - File: [`src/types/`](../src/types/)

- [ ] **Refactor `analyzePGN`**
    - Compose parse + replay + trackers internally (behavior unchanged for existing callers)

- [ ] **Surface header/read policy**
    - Explicit enough for count-only / header-filter callers without inventing game trackers

## Done when

- Users can count moves or read headers without board replay via public API.
- Integration tests cover `parsePGN` on fixture PGNs.

## Verification

```bash
npm test
npm run typecheck
npm run lint
```

## Explicitly not doing

- Validate mode, RAV/FEN/variants, comment preservation (see IDEAS.md)
