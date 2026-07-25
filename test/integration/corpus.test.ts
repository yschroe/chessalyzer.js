import { describe, it, beforeAll, expect } from 'bun:test';

// Optional golden regression tests against the large corpus (test/corpus/).
// Skipped automatically when corpus files are not present locally.
import { Chessalyzer, GameTracker, PieceTracker } from 'chessalyzer.js';

import { corpusPath, getCorpusEntry } from '../helpers/fixtures';

const pgnPath = await corpusPath('asorted');
const corpusAvailable = pgnPath !== null;
const describeCorpus = corpusAvailable ? describe : describe.skip;

describeCorpus('Corpus regression (asorted)', () => {
    const entry = getCorpusEntry('asorted');

    describe('Basic parsing', () => {
        let data;
        beforeAll(async () => {
            data = await Chessalyzer.analyzePGN(pgnPath);
        });

        it('processed all games in the corpus file', () => {
            expect(data.cntGames).toBe(entry.expected.cntGames);
        });

        it('processed all moves in the corpus file', () => {
            expect(data.cntMoves).toBe(entry.expected.cntMoves);
        });
    });

    describe('Filtering', () => {
        it('limits by cntGames', async () => {
            const data = await Chessalyzer.analyzePGN(pgnPath, { config: { cntGames: 100 } });
            expect(data.cntGames).toBe(100);
        });

        it('filters by result', async () => {
            const data = await Chessalyzer.analyzePGN(pgnPath, {
                config: { filter: (game) => game.Result === '1-0' },
            });
            expect(data.cntGames).toBe(entry.expected.filters.whiteWins);
        });

        it('combines filter and count', async () => {
            const data = await Chessalyzer.analyzePGN(pgnPath, {
                config: {
                    cntGames: 500,
                    filter: (game) => game.Result === '0-1',
                },
            });
            expect(data.cntGames).toBe(500);
        });
    });

    describe('Trackers', () => {
        it('runs a single tracker across the full corpus', async () => {
            const gameTracker = new GameTracker();
            const data = await Chessalyzer.analyzePGN(pgnPath, { trackers: [gameTracker] });
            expect(data.cntGames).toBe(entry.expected.cntGames);
        });

        it('runs multiple configs with different filters', async () => {
            const gameTracker = new GameTracker();
            const pieceTracker = new PieceTracker();
            const data = await Chessalyzer.analyzePGN(pgnPath, [
                {
                    trackers: [gameTracker],
                    config: {
                        cntGames: entry.expected.multiConfig.highRatedGames,
                        filter: (val) => val.WhiteElo > 1500,
                    },
                },
                {
                    trackers: [pieceTracker],
                    config: {
                        cntGames: entry.expected.multiConfig.lowRatedGames,
                        filter: (val) => val.WhiteElo < 1500,
                    },
                },
            ]);
            expect(data[0].cntGames).toBe(entry.expected.multiConfig.highRatedGames);
            expect(data[1].cntGames).toBe(entry.expected.multiConfig.lowRatedGames);
        });

        it('runs in single-threaded mode', async () => {
            const data = await Chessalyzer.analyzePGN(pgnPath, undefined, null);
            expect(data.cntGames).toBe(entry.expected.cntGames);
            expect(data.cntMoves).toBe(entry.expected.cntMoves);
        });
    });

    describe('GameTracker golden values', () => {
        describe('Multithreaded', () => {
            let data;
            const gameTracker = new GameTracker();
            beforeAll(async () => {
                data = await Chessalyzer.analyzePGN(pgnPath, { trackers: [gameTracker] });
            });

            it('matches parser game count', () => {
                expect(data.cntGames).toBe(gameTracker.cntGames);
            });

            it('sums result counts to total games', () => {
                const resultsSum = Object.values(gameTracker.results).reduce((a, c) => a + c, 0);
                expect(resultsSum).toBe(data.cntGames);
            });
        });

        describe('Singlethreaded', () => {
            let data;
            const gameTracker = new GameTracker();
            beforeAll(async () => {
                data = await Chessalyzer.analyzePGN(pgnPath, { trackers: [gameTracker] }, null);
            });

            it('matches parser game count', () => {
                expect(data.cntGames).toBe(gameTracker.cntGames);
            });
        });

        describe('Filtered white wins', () => {
            const gameTracker = new GameTracker();
            beforeAll(async () => {
                await Chessalyzer.analyzePGN(pgnPath, {
                    trackers: [gameTracker],
                    config: {
                        cntGames: entry.golden.gameTracker.filterWhiteWins,
                        filter: (game) => game.Result === '1-0',
                    },
                });
            });

            it('counts only white wins', () => {
                expect(gameTracker.results.white).toBe(entry.golden.gameTracker.filterWhiteWins);
                expect(gameTracker.results.black).toBe(0);
                expect(gameTracker.results.draw).toBe(0);
            });
        });

        describe('ECO counts', () => {
            const gameTracker = new GameTracker();
            beforeAll(async () => {
                await Chessalyzer.analyzePGN(pgnPath, { trackers: [gameTracker] });
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
                await Chessalyzer.analyzePGN(pgnPath, { trackers: [pieceTracker] });
            });

            it('tracks the reference square pair', () => {
                const { color, from, to, count } = entry.golden.pieceTracker.square;
                expect(pieceTracker[color][from][to]).toBe(count);
            });
        });

        describe('Singlethreaded', () => {
            const pieceTracker = new PieceTracker();
            beforeAll(async () => {
                await Chessalyzer.analyzePGN(pgnPath, { trackers: [pieceTracker] }, null);
            });

            it('tracks the reference square pair', () => {
                const { color, from, to, count } = entry.golden.pieceTracker.square;
                expect(pieceTracker[color][from][to]).toBe(count);
            });
        });

        describe('Heatmaps', () => {
            const pieceTracker = new PieceTracker();
            beforeAll(async () => {
                await Chessalyzer.analyzePGN(pgnPath, { trackers: [pieceTracker] });
            });

            it('PIECE_CAPTURED preset', () => {
                const data = pieceTracker.generateHeatmap('PIECE_CAPTURED', 'a8');
                expect(data.map[0][0]).toBe(0);
                expect(data.map[1][0]).toBe(0);
                expect(data.map[7][0]).toBe(entry.golden.pieceTracker.heatmap.PIECE_CAPTURED_a8);
            });

            it('PIECE_CAPTURED_BY preset', () => {
                const data = pieceTracker.generateHeatmap('PIECE_CAPTURED_BY', 'a8');
                expect(data.map[0][0]).toBe(0);
                expect(data.map[1][0]).toBe(0);
                expect(data.map[7][0]).toBe(entry.golden.pieceTracker.heatmap.PIECE_CAPTURED_BY_a8);
            });

            it('custom heatmap function', () => {
                const customFunc = (data, loopSqrData, sqrData) => {
                    const sqrPiece = sqrData.piece;
                    const loopPiece = loopSqrData.piece;
                    let val = 0;
                    if (sqrPiece && loopPiece && loopPiece.color !== sqrPiece.color) {
                        val = data[loopPiece.color][loopPiece.name][sqrPiece.name];
                    }
                    return val;
                };
                const data = pieceTracker.generateHeatmap(customFunc, 'a8');
                expect(data.map[0][0]).toBe(0);
                expect(data.map[1][0]).toBe(0);
                expect(data.map[7][0]).toBe(entry.golden.pieceTracker.heatmap.custom_a8);
            });

            it('throws when preset is missing', () => {
                expect(() => pieceTracker.generateHeatmap('I_DO_NOT_EXIST', 'a8')).toThrow(
                    "Heatmap preset 'I_DO_NOT_EXIST' not found!",
                );
            });
        });
    });
});

if (!corpusAvailable) {
    console.warn(
        'Skipping corpus tests: asorted-games.pgn not found. Run: bun run test:fetch-corpus',
    );
}
