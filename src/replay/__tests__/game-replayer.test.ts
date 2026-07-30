import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import type ChessBoard from '#board/chess-board';
import { parseGamesFromLines } from '#pgn/game-assembler';
import GameReplayer from '#replay/game-replayer';
import SanApplier from '#replay/san-applier';
import SanContext from '#replay/san-context';
import { MoveTracker } from '#trackers/base-tracker';
import type { Action } from '#types/actions';
import type { GameProcessorAnalysisConfig } from '#types/analysis-runtime';
import type { AssembledGame, GameResult } from '#types/parse-pgn';

import { fixturePath } from '../../../test/helpers/fixtures';

function emptyCfg(): GameProcessorAnalysisConfig {
    return {
        trackers: { move: [], game: [] },
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

        it('feeds move trackers on the actions replay path', () => {
            const replayer = new GameReplayer();
            const cfg = emptyCfg();

            class ActionCounter extends MoveTracker {
                actionCount = 0;

                override trackMoves(actions: Action[]) {
                    this.actionCount += actions.length;
                }

                override merge() {}
            }

            const counter = new ActionCounter();
            cfg.trackers.move.push(counter);

            replayer.processGame(game(['e4', 'e5']), cfg, 'actions', 0, 'abort');

            expect(counter.actionCount).toBe(2);
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
