import { describe, it, beforeAll, expect } from 'bun:test';

// Optional golden regression tests against the large corpus (test/corpus/).
// Skipped automatically when corpus files are not present locally.
import { analyzePGN } from 'chessalyzer';
import type { AnalyzeResult } from 'chessalyzer';
import type { ParsedGame } from 'chessalyzer/pgn';
import {
    gameTracker,
    generateHeatmap,
    isStartingPieceName,
    PieceHeatmapPresets,
    pieceTracker,
} from 'chessalyzer/trackers';
import type { GameTrackerState, HeatmapFn, PieceTrackerState } from 'chessalyzer/trackers';

import { corpusPath, getCorpusEntry } from '~/test/helpers/fixtures';
import { isPieceTrackerState } from '~/test/helpers/tracker-state';

const pgnPath = await corpusPath('asorted');
const corpusAvailable = pgnPath !== null;

/** Custom analysis scoped to a starting piece via outer closure (same idea as preset factories). */
const customPieceHeatmapFunc =
    (piece: { color: 'b' | 'w'; name: string }): HeatmapFn =>
    ({ data, square }) => {
        const squarePiece = square.piece;
        let val = 0;
        if (
            squarePiece &&
            squarePiece.color !== piece.color &&
            isPieceTrackerState(data) &&
            isStartingPieceName(squarePiece.name) &&
            isStartingPieceName(piece.name)
        ) {
            val = data[squarePiece.color][squarePiece.name][piece.name];
        }
        return val;
    };

if (corpusAvailable) {
    describe('Corpus regression (asorted)', () => {
        if (!pgnPath) throw new Error('Corpus path required');
        const path = pgnPath;
        const entry = getCorpusEntry('asorted');

        describe('Basic parsing', () => {
            let data: AnalyzeResult;
            beforeAll(async () => {
                data = await analyzePGN(path);
            });

            it('processed all games in the corpus file', () => {
                expect(data.gameCount).toBe(entry.expected.games);
            });

            it('processed all moves in the corpus file', () => {
                expect(data.moveCount).toBe(entry.expected.moves);
            });
        });

        describe('Filtering', () => {
            it('limits by maxGames', async () => {
                const data = await analyzePGN(path, { maxGames: 100 });
                expect(data.gameCount).toBe(100);
            });

            it('filters by result', async () => {
                const data = await analyzePGN(path, {
                    workers: false,
                    filter: (game: ParsedGame) => game.result === '1-0',
                });
                expect(data.gameCount).toBe(entry.expected.filters.whiteWins);
            });

            it('combines filter and count', async () => {
                const data = await analyzePGN(path, {
                    workers: false,
                    maxGames: 500,
                    filter: (game: ParsedGame) => game.result === '0-1',
                });
                expect(data.gameCount).toBe(500);
            });
        });

        describe('Trackers', () => {
            it('runs a single tracker across the full corpus', async () => {
                const data = await analyzePGN(path, { trackers: [gameTracker()] });
                expect(data.gameCount).toBe(entry.expected.games);
            });

            it('runs multiple configs with different filters', async () => {
                const data = await analyzePGN(path, {
                    workers: false,
                    headers: true,
                    runs: [
                        {
                            trackers: [gameTracker()],
                            maxGames: entry.expected.multiConfig.highRatedGames,
                            filter: (game: ParsedGame) => Number(game.headers?.WhiteElo) > 1500,
                        },
                        {
                            trackers: [pieceTracker()],
                            maxGames: entry.expected.multiConfig.lowRatedGames,
                            filter: (game: ParsedGame) => Number(game.headers?.WhiteElo) < 1500,
                        },
                    ],
                });
                expect(data.runs[0]?.gameCount).toBe(entry.expected.multiConfig.highRatedGames);
                expect(data.runs[1]?.gameCount).toBe(entry.expected.multiConfig.lowRatedGames);
            });

            it('runs in single-threaded mode', async () => {
                const data = await analyzePGN(path, { workers: false });
                expect(data.gameCount).toBe(entry.expected.games);
                expect(data.moveCount).toBe(entry.expected.moves);
            });
        });

        describe('GameTracker golden values', () => {
            describe('Multithreaded', () => {
                let data: AnalyzeResult;
                let state: GameTrackerState;
                beforeAll(async () => {
                    const games = gameTracker();
                    data = await analyzePGN(path, { trackers: [games] });
                    state = games.state;
                });

                it('matches PGN parse game count', () => {
                    expect(data.gameCount).toBe(state.gameCount);
                });

                it('sums result counts to total games', () => {
                    const resultsSum = Object.values(state.results).reduce((a, c) => a + c, 0);
                    expect(resultsSum).toBe(data.gameCount);
                });
            });

            describe('Singlethreaded', () => {
                let data: AnalyzeResult;
                let state: GameTrackerState;
                beforeAll(async () => {
                    const games = gameTracker();
                    data = await analyzePGN(path, { trackers: [games], workers: false });
                    state = games.state;
                });

                it('matches PGN parse game count', () => {
                    expect(data.gameCount).toBe(state.gameCount);
                });
            });

            describe('Filtered white wins', () => {
                let state: GameTrackerState;
                beforeAll(async () => {
                    const games = gameTracker();
                    await analyzePGN(path, {
                        workers: false,
                        trackers: [games],
                        maxGames: entry.golden.gameTracker.filterWhiteWins,
                        filter: (game: ParsedGame) => game.result === '1-0',
                    });
                    state = games.state;
                });

                it('counts only white wins', () => {
                    expect(state.results.white).toBe(entry.golden.gameTracker.filterWhiteWins);
                    expect(state.results.black).toBe(0);
                    expect(state.results.draw).toBe(0);
                });
            });

            describe('ECO counts', () => {
                let state: GameTrackerState;
                beforeAll(async () => {
                    const games = gameTracker();
                    await analyzePGN(path, { trackers: [games] });
                    state = games.state;
                });

                it('matches known ECO totals', () => {
                    for (const [eco, count] of Object.entries(entry.golden.gameTracker.eco)) {
                        expect(state.eco[eco]).toBe(count);
                    }
                });
            });
        });

        describe('PieceTracker golden values', () => {
            describe('Multithreaded', () => {
                let state: PieceTrackerState;
                beforeAll(async () => {
                    const pieces = pieceTracker();
                    await analyzePGN(path, { trackers: [pieces] });
                    state = pieces.state;
                });

                it('tracks the reference square pair', () => {
                    const { color, from, to, count } = entry.golden.pieceTracker.square;
                    const side = color === 'b' ? state.b : state.w;
                    if (isStartingPieceName(from) && isStartingPieceName(to)) {
                        expect(side[from][to]).toBe(count);
                    }
                });
            });

            describe('Singlethreaded', () => {
                let state: PieceTrackerState;
                beforeAll(async () => {
                    const pieces = pieceTracker();
                    await analyzePGN(path, {
                        trackers: [pieces],
                        workers: false,
                    });
                    state = pieces.state;
                });

                it('tracks the reference square pair', () => {
                    const { color, from, to, count } = entry.golden.pieceTracker.square;
                    const side = color === 'b' ? state.b : state.w;
                    if (isStartingPieceName(from) && isStartingPieceName(to)) {
                        expect(side[from][to]).toBe(count);
                    }
                });
            });

            describe('Heatmaps', () => {
                let state: PieceTrackerState;
                beforeAll(async () => {
                    const pieces = pieceTracker();
                    await analyzePGN(path, { trackers: [pieces] });
                    state = pieces.state;
                });

                it('PIECE_CAPTURED preset', () => {
                    const data = generateHeatmap(
                        state,
                        PieceHeatmapPresets.PIECE_CAPTURED({ color: 'b', name: 'Ra' }),
                    );
                    expect(data.map[0]?.[0]).toBe(0);
                    expect(data.map[1]?.[0]).toBe(0);
                    expect(data.map[7]?.[0]).toBe(
                        entry.golden.pieceTracker.heatmap.PIECE_CAPTURED_a8,
                    );
                });

                it('PIECE_CAPTURED_BY preset', () => {
                    const data = generateHeatmap(
                        state,
                        PieceHeatmapPresets.PIECE_CAPTURED_BY({ color: 'b', name: 'Ra' }),
                    );
                    expect(data.map[0]?.[0]).toBe(0);
                    expect(data.map[1]?.[0]).toBe(0);
                    expect(data.map[7]?.[0]).toBe(
                        entry.golden.pieceTracker.heatmap.PIECE_CAPTURED_BY_a8,
                    );
                });

                it('custom heatmap function', () => {
                    const data = generateHeatmap(
                        state,
                        customPieceHeatmapFunc({ color: 'b', name: 'Ra' }),
                    );
                    expect(data.map[0]?.[0]).toBe(0);
                    expect(data.map[1]?.[0]).toBe(0);
                    expect(data.map[7]?.[0]).toBe(entry.golden.pieceTracker.heatmap.custom_a8);
                });
            });
        });
    });
} else {
    describe.skip('Corpus regression (asorted)', () => {});
    console.warn('Skipping corpus tests: asorted-games.pgn not found in test/corpus/.');
}
