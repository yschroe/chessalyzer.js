# Sprint 10 — Board state for validate / FEN

**Effort:** Medium (2 sessions)  
**Impact:** Medium — unblocks validate mode and FEN export  
**Depends on:** Sprint 09 recommended

## Goal

Track castling rights and en passant on `ChessBoard` so trust→validate and FEN export are feasible later.

## Tasks

- [ ] **Castling rights on board**
    - Update on moves and castling; expose for FEN generation
    - File: [`src/board/chess-board.ts`](../src/board/chess-board.ts)

- [ ] **En passant target square**
    - Track after double pawn pushes; clear appropriately

- [ ] **Keep trust-path performance**
    - Rights/EP updates only where needed, or behind richer replay policy

- [ ] **Tests**
    - Unit tests for rights/EP after castling, en passant, captures

## Done when

- Board can emit correct FEN for standard games from initial position.
- No measurable regression on `bench:perf` for count-only / trust replay paths.

## Verification

```bash
npm test
npm run bench:perf
```

## Explicitly not doing

- Chess960, RAV trees, FEN/`SetUp` start positions (IDEAS longer term)
