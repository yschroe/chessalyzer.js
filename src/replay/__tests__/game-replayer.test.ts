import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import type ChessBoard from '#board/chess-board';
import type { AnalyzeRunState } from '#core/analysis-runtime';
import { isReplayError } from '#core/analyze-errors';
import { TrackerHost } from '#core/tracker-host';
import { parseGamesFromLines } from '#pgn/game-assembler';
import GameReplayer from '#replay/game-replayer';
import SanApplier from '#replay/san-applier';
import SanContext from '#replay/san-context';
import { defineGameTracker, defineMoveTracker } from '#trackers/define-tracker';
import type { Action } from '#types/actions';
import type { AssembledGame, GameResult } from '#types/parse-pgn';
import { fixturePath } from '~/test/helpers/fixtures';

function emptyCfg(): AnalyzeRunState {
    return {
        trackerHost: new TrackerHost([]),
        processedMoves: 0,
        processedGames: 0,
        skippedGames: 0,
        errors: [],
    };
}

function game(moves: string[], result: GameResult = '1-0'): AssembledGame {
    return { moves, result };
}

/** Same SanApplier path GameReplayer uses for `'board'` mode. */
function boardAfterSans(moves: string[]): ChessBoard {
    const ctx = new SanContext();
    const applier = new SanApplier(ctx);
    for (const san of moves) {
        applier.apply(san);
        ctx.activePlayer = ctx.activePlayer === 'w' ? 'b' : 'w';
    }
    return ctx.board;
}

describe('GameReplayer', () => {
    describe('processGame counters and policy', () => {
        it('counts processed games and moves', () => {
            const replayer = new GameReplayer();
            const cfg = emptyCfg();

            replayer.processGame(game(['e4', 'e5', 'Nf3']), cfg, 'board', 0, 'abort');

            expect(cfg.processedGames).toBe(1);
            expect(cfg.processedMoves).toBe(3);
        });

        it('keeps games isolated and calls game hooks when alternating replay modes', () => {
            const replayer = new GameReplayer();
            const cfg = emptyCfg();
            const counter = defineGameTracker({
                id: 'mixed-mode-counter',
                init: () => ({ games: 0, moves: 0, ends: 0 }),
                track(state, parsed) {
                    state.games += 1;
                    state.moves += parsed.moves.length;
                },
                onGameEnd(state) {
                    state.ends += 1;
                },
                merge(state, other) {
                    state.games += other.games;
                    state.moves += other.moves;
                    state.ends += other.ends;
                },
            })();
            cfg.trackerHost = new TrackerHost([counter]);

            const modes = ['skip', 'board', 'skip', 'actions', 'skip', 'actions'] as const;
            for (const [index, mode] of modes.entries()) {
                replayer.processGame(game(['e4', 'e5', 'Nf3']), cfg, mode, index, 'abort');

                expect(replayer.board.getPieceAt(6, 4)).toEqual({ name: 'Pe', color: 'w' });
                expect(replayer.board.getPieceAt(1, 4)).toEqual({ name: 'Pe', color: 'b' });
                expect(replayer.board.getPieceAt(7, 6)).toEqual({ name: 'Ng', color: 'w' });
                expect(replayer.board.getPieceAt(4, 4)).toBeNull();
                expect(replayer.board.getPieceAt(3, 4)).toBeNull();
                expect(replayer.board.getPieceAt(5, 5)).toBeNull();
            }

            expect(cfg.processedGames).toBe(6);
            expect(cfg.processedMoves).toBe(18);
            expect(cfg.errors).toEqual([]);
            expect(counter.state).toEqual({ games: 6, moves: 18, ends: 6 });
        });

        it.each([
            ['board', 'abort'],
            ['board', 'skip-game'],
            ['actions', 'abort'],
            ['actions', 'skip-game'],
        ] as const)(
            'restores the board after a partial %s replay fails with %s',
            (mode, policy) => {
                const replayer = new GameReplayer();
                const cfg = emptyCfg();
                const fail = () =>
                    replayer.processGame(game(['e4', 'e5', 'Nf9']), cfg, mode, 0, policy);

                if (policy === 'abort') {
                    expect(fail).toThrow();
                } else {
                    fail();
                    expect(cfg.skippedGames).toBe(1);
                    expect(cfg.errors).toHaveLength(1);
                }
                expect(cfg.processedGames).toBe(0);
                expect(cfg.processedMoves).toBe(0);
                expect(replayer.board.getPieceAt(6, 4)).toEqual({ name: 'Pe', color: 'w' });
                expect(replayer.board.getPieceAt(1, 4)).toEqual({ name: 'Pe', color: 'b' });
                expect(replayer.board.getPieceAt(4, 4)).toBeNull();
                expect(replayer.board.getPieceAt(3, 4)).toBeNull();

                replayer.processGame(game(['e4', 'e5', 'Nf3']), cfg, 'skip', 1, 'abort');
                replayer.processGame(game(['e4', 'e5', 'Nf3']), cfg, mode, 2, 'abort');

                expect(cfg.processedGames).toBe(2);
                expect(cfg.processedMoves).toBe(6);
                expect(replayer.board.getPieceAt(7, 6)).toEqual({ name: 'Ng', color: 'w' });
                expect(replayer.board.getPieceAt(5, 5)).toBeNull();
            },
        );

        it('feeds move trackers on the actions replay path', () => {
            const replayer = new GameReplayer();
            const cfg = emptyCfg();

            const counter = defineMoveTracker({
                id: 'action-counter',
                init: () => ({ actionCount: 0 }),
                track: (state, actions: Action[]) => {
                    state.actionCount += actions.length;
                },
                merge: (state, other) => {
                    state.actionCount += other.actionCount;
                },
            });
            cfg.trackerHost = new TrackerHost([counter()]);

            replayer.processGame(game(['e4', 'e5']), cfg, 'actions', 0, 'abort');

            expect(cfg.trackerHost.moveEntries[0]?.state).toEqual({ actionCount: 2 });
            expect(cfg.processedMoves).toBe(2);
        });

        it('skip-game records replay failures without counting the game', () => {
            const replayer = new GameReplayer();
            const cfg = emptyCfg();

            replayer.processGame(game(['Nf9']), cfg, 'board', 0, 'skip-game');

            expect(cfg.processedGames).toBe(0);
            expect(cfg.skippedGames).toBe(1);
            expect(cfg.errors).toHaveLength(1);
        });

        it('fails a pawn capture from an empty square instead of emitting null piece fields', () => {
            const replayer = new GameReplayer();
            const cfg = emptyCfg();

            const probe = defineMoveTracker({
                id: 'null-probe',
                init: () => ({ nulls: 0 }),
                track: (state, actions: Action[]) => {
                    for (const action of actions) {
                        if (action.type === 'move' && (action.piece as unknown) == null) {
                            state.nulls += 1;
                        }
                        if (
                            action.type === 'capture' &&
                            ((action.takingPiece as unknown) == null ||
                                (action.takenPiece as unknown) == null)
                        ) {
                            state.nulls += 1;
                        }
                    }
                },
                merge: (state, other) => {
                    state.nulls += other.nulls;
                },
            });
            cfg.trackerHost = new TrackerHost([probe()]);

            // `cxd5` resolves its origin to c4 arithmetically, but no pawn stands there.
            replayer.processGame(game(['e4', 'd5', 'cxd5']), cfg, 'actions', 0, 'skip-game');

            expect(cfg.skippedGames).toBe(1);
            const [error] = cfg.errors;
            expect(isReplayError(error) && error.reason).toBe('IllegalMove');
            expect(error?.message).toContain('empty square');
            expect(cfg.trackerHost.moveEntries[0]?.state).toEqual({ nulls: 0 });
        });

        it('reset restores the starting position', () => {
            const replayer = new GameReplayer();
            const cfg = emptyCfg();

            replayer.processGame(game(['e4']), cfg, 'board', 0, 'abort');
            replayer.reset();

            expect(replayer.board.getPieceAt(6, 4)?.name).toBe('Pe');
            expect(replayer.board.getPieceAt(4, 4)).toBeNull();
        });
    });

    describe('trust-mode board state (board mode / SanApplier path)', () => {
        it('replays a basic SAN sequence', () => {
            const board = boardAfterSans(['e4', 'e5', 'Nf3']);

            expect(board.getPieceAt(4, 4)?.name).toBe('Pe');
            expect(board.getPieceAt(3, 4)?.name).toBe('Pe');
            const knight = board.getPieceAt(5, 5);
            expect(knight?.name?.charAt(0)).toBe('N');
            expect(knight?.color).toBe('w');
        });

        it('replays captures', () => {
            const board = boardAfterSans(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4']);

            const bishop = board.getPieceAt(4, 1);
            expect(bishop?.name?.charAt(0)).toBe('B');
            expect(bishop?.color).toBe('b');
        });

        it('replays castling', () => {
            const board = boardAfterSans(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O']);

            expect(board.getPieceAt(7, 6)?.name).toBe('Ke');
            expect(board.getPieceAt(7, 5)?.name).toBe('Rh');
            expect(board.getPieceAt(7, 4)).toBeNull();
        });

        it('replays pawn promotion', () => {
            const [promoGame] = parseGamesFromLines(
                readFileSync(fixturePath('promotion'), 'utf8').split('\n'),
                { parseHeaders: false },
            );
            const board = boardAfterSans(promoGame?.moves ?? []);

            const queen = board.getPieceAt(0, 6);
            expect(queen?.name?.charAt(0)).toBe('Q');
            expect(queen?.color).toBe('w');
        });
    });
});
