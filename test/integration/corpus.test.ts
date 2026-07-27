import { describe, it, beforeAll, expect } from 'bun:test';

// Optional golden regression tests against the large corpus (test/corpus/).
// Skipped automatically when corpus files are not present locally.
import { analyzePGN, GameTracker, PieceTracker, isTrackedPiece } from 'chessalyzer.js';

import type { AnalyzeResult } from '../../src/types/analysis';
import type { Game } from '../../src/types/game';
import type { HeatmapAnalysisFunc } from '../../src/types/tracker';
import { corpusPath, getCorpusEntry } from '../helpers/fixtures';

const pgnPath = await corpusPath('asorted');
const corpusAvailable = pgnPath !== null;

function isPieceTracker(data: unknown): data is PieceTracker {
    return typeof data === 'object' && data !== null && 'b' in data && 'w' in data;
}

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
                expect(data.games).toBe(entry.expected.cntGames);
            });

            it('processed all moves in the corpus file', () => {
                expect(data.moves).toBe(entry.expected.cntMoves);
            });
        });

        describe('Filtering', () => {
            it('limits by maxGames', async () => {
                const data = await analyzePGN(path, { maxGames: 100 });
                expect(data.games).toBe(100);
            });

            it('filters by result', async () => {
                const data = await analyzePGN(path, {
                    filter: (game: Game) => game.Result === '1-0',
                });
                expect(data.games).toBe(entry.expected.filters.whiteWins);
            });

            it('combines filter and count', async () => {
                const data = await analyzePGN(path, {
                    maxGames: 500,
                    filter: (game: Game) => game.Result === '0-1',
                });
                expect(data.games).toBe(500);
            });
        });

        describe('Trackers', () => {
            it('runs a single tracker across the full corpus', async () => {
                const gameTracker = new GameTracker();
                const data = await analyzePGN(path, { trackers: [gameTracker] });
                expect(data.games).toBe(entry.expected.cntGames);
            });

            it('runs multiple configs with different filters', async () => {
                const gameTracker = new GameTracker();
                const pieceTracker = new PieceTracker();
                const data = await analyzePGN(path, {
                    runs: [
                        {
                            trackers: [gameTracker],
                            maxGames: entry.expected.multiConfig.highRatedGames,
                            filter: (game: Game) => Number(game.WhiteElo) > 1500,
                        },
                        {
                            trackers: [pieceTracker],
                            maxGames: entry.expected.multiConfig.lowRatedGames,
                            filter: (game: Game) => Number(game.WhiteElo) < 1500,
                        },
                    ],
                });
                expect(data.runs[0]?.games).toBe(entry.expected.multiConfig.highRatedGames);
                expect(data.runs[1]?.games).toBe(entry.expected.multiConfig.lowRatedGames);
            });

            it('runs in single-threaded mode', async () => {
                const data = await analyzePGN(path, { workers: false });
                expect(data.games).toBe(entry.expected.cntGames);
                expect(data.moves).toBe(entry.expected.cntMoves);
            });
        });

        describe('GameTracker golden values', () => {
            describe('Multithreaded', () => {
                let data: AnalyzeResult;
                const gameTracker = new GameTracker();
                beforeAll(async () => {
                    data = await analyzePGN(path, { trackers: [gameTracker] });
                });

                it('matches parser game count', () => {
                    expect(data.games).toBe(gameTracker.cntGames);
                });

                it('sums result counts to total games', () => {
                    const resultsSum = Object.values(gameTracker.results).reduce(
                        (a, c) => a + c,
                        0,
                    );
                    expect(resultsSum).toBe(data.games);
                });
            });

            describe('Singlethreaded', () => {
                let data: AnalyzeResult;
                const gameTracker = new GameTracker();
                beforeAll(async () => {
                    data = await analyzePGN(path, { trackers: [gameTracker], workers: false });
                });

                it('matches parser game count', () => {
                    expect(data.games).toBe(gameTracker.cntGames);
                });
            });

            describe('Filtered white wins', () => {
                const gameTracker = new GameTracker();
                beforeAll(async () => {
                    await analyzePGN(path, {
                        trackers: [gameTracker],
                        maxGames: entry.golden.gameTracker.filterWhiteWins,
                        filter: (game: Game) => game.Result === '1-0',
                    });
                });

                it('counts only white wins', () => {
                    expect(gameTracker.results.white).toBe(
                        entry.golden.gameTracker.filterWhiteWins,
                    );
                    expect(gameTracker.results.black).toBe(0);
                    expect(gameTracker.results.draw).toBe(0);
                });
            });

            describe('ECO counts', () => {
                const gameTracker = new GameTracker();
                beforeAll(async () => {
                    await analyzePGN(path, { trackers: [gameTracker] });
                });

                it('matches known ECO totals', () => {
                    for (const [eco, count] of Object.entries(entry.golden.gameTracker.ECO)) {
                        expect(gameTracker.ECO[eco]).toBe(count);
                    }
                });
            });
        });

        describe('PieceTracker golden values', () => {
            describe('Multithreaded', () => {
                const pieceTracker = new PieceTracker();
                beforeAll(async () => {
                    await analyzePGN(path, { trackers: [pieceTracker] });
                });

                it('tracks the reference square pair', () => {
                    const { color, from, to, count } = entry.golden.pieceTracker.square;
                    const side = color === 'b' ? pieceTracker.b : pieceTracker.w;
                    if (isTrackedPiece(from) && isTrackedPiece(to)) {
                        expect(side[from][to]).toBe(count);
                    }
                });
            });

            describe('Singlethreaded', () => {
                const pieceTracker = new PieceTracker();
                beforeAll(async () => {
                    await analyzePGN(path, { trackers: [pieceTracker], workers: false });
                });

                it('tracks the reference square pair', () => {
                    const { color, from, to, count } = entry.golden.pieceTracker.square;
                    const side = color === 'b' ? pieceTracker.b : pieceTracker.w;
                    if (isTrackedPiece(from) && isTrackedPiece(to)) {
                        expect(side[from][to]).toBe(count);
                    }
                });
            });

            describe('Heatmaps', () => {
                const pieceTracker = new PieceTracker();
                beforeAll(async () => {
                    await analyzePGN(path, { trackers: [pieceTracker] });
                });

                it('PIECE_CAPTURED preset', () => {
                    const data = pieceTracker.generateHeatmap('PIECE_CAPTURED', 'a8');
                    expect(data.map[0]?.[0]).toBe(0);
                    expect(data.map[1]?.[0]).toBe(0);
                    expect(data.map[7]?.[0]).toBe(
                        entry.golden.pieceTracker.heatmap.PIECE_CAPTURED_a8,
                    );
                });

                it('PIECE_CAPTURED_BY preset', () => {
                    const data = pieceTracker.generateHeatmap('PIECE_CAPTURED_BY', 'a8');
                    expect(data.map[0]?.[0]).toBe(0);
                    expect(data.map[1]?.[0]).toBe(0);
                    expect(data.map[7]?.[0]).toBe(
                        entry.golden.pieceTracker.heatmap.PIECE_CAPTURED_BY_a8,
                    );
                });

                it('custom heatmap function', () => {
                    const customFunc: HeatmapAnalysisFunc = (data, loopSqrData, sqrData) => {
                        if (!sqrData) return 0;
                        const sqrPiece = sqrData.piece;
                        const loopPiece = loopSqrData.piece;
                        let val = 0;
                        if (
                            sqrPiece &&
                            loopPiece &&
                            loopPiece.color !== sqrPiece.color &&
                            isPieceTracker(data) &&
                            isTrackedPiece(loopPiece.name) &&
                            isTrackedPiece(sqrPiece.name)
                        ) {
                            val = data[loopPiece.color][loopPiece.name][sqrPiece.name];
                        }
                        return val;
                    };
                    const data = pieceTracker.generateHeatmap(customFunc, 'a8');
                    expect(data.map[0]?.[0]).toBe(0);
                    expect(data.map[1]?.[0]).toBe(0);
                    expect(data.map[7]?.[0]).toBe(entry.golden.pieceTracker.heatmap.custom_a8);
                });

                it('throws when preset is missing', () => {
                    expect(() => pieceTracker.generateHeatmap('I_DO_NOT_EXIST', 'a8')).toThrow(
                        "Heatmap preset 'I_DO_NOT_EXIST' not found!",
                    );
                });
            });
        });
    });
} else {
    describe.skip('Corpus regression (asorted)', () => {});
    console.warn(
        'Skipping corpus tests: asorted-games.pgn not found. Run: bun run test:fetch-corpus',
    );
}
