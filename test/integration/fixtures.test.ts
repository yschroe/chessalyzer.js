import { describe, it, beforeAll, afterAll, expect } from 'bun:test';

import { analyzePGN, getTrackerState } from 'chessalyzer';
import type { AnalyzeResult } from 'chessalyzer';
import type { ParsedGame } from 'chessalyzer/pgn';
import { GameTracker, PieceTracker, TileTracker } from 'chessalyzer/trackers';

import {
    allFixtureIds,
    cleanupTmpPgns,
    fixtureExpected,
    fixturePath,
    getFixtureEntry,
    repeatPgn,
} from '~/test/helpers/fixtures';

// Integration tests against small committed PGN fixtures (test/fixtures/).
describe('Fixtures', () => {
    afterAll(async () => {
        await cleanupTmpPgns();
    });

    for (const id of allFixtureIds) {
        describe(id, () => {
            let data: AnalyzeResult;

            beforeAll(async () => {
                const entry = getFixtureEntry(id);
                data = await analyzePGN(fixturePath(id), {
                    workers: false,
                    ...entry.analyzeOptions,
                });
            });

            it('parses the expected number of games and moves', () => {
                const expected = getFixtureEntry(id).expected;
                expect(data.gameCount).toBe(expected.games);
                expect(data.moveCount).toBe(expected.moves);
                if (expected.skippedGames !== undefined) {
                    expect(data.skippedGames).toBe(expected.skippedGames);
                }
            });
        });
    }

    describe('corrupt fixture', () => {
        it('drops the incomplete trailing game', async () => {
            const data = await analyzePGN(fixturePath('corrupt'), { workers: false });
            expect(data.gameCount).toBe(1);
        });
    });

    describe('results-mix filtering', () => {
        it('limits by maxGames (single-threaded)', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                maxGames: 3,
                workers: false,
            });
            expect(data.gameCount).toBe(3);
        });

        it('limits by maxGames (multithreaded)', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                maxGames: 3,
            });
            expect(data.gameCount).toBe(3);
        });

        it('filters by result (single-threaded)', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                filter: (game: ParsedGame) => game.result === '1-0',
                workers: false,
            });
            expect(data.gameCount).toBe(3);
        });

        it('rejects filter without workers: false', () => {
            return expect(
                analyzePGN(fixturePath('results-mix'), {
                    filter: (game: ParsedGame) => game.result === '1-0',
                }),
            ).rejects.toThrow('filter requires workers: false');
        });

        it('combines filter and count (single-threaded)', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                maxGames: 2,
                filter: (game: ParsedGame) => game.result === '0-1',
                workers: false,
            });
            expect(data.gameCount).toBe(2);
        });
    });

    describe('volume via repeated fixtures', () => {
        it('processes many games from a repeated small fixture', async () => {
            const path = await repeatPgn('results-mix', 20);
            const data = await analyzePGN(path, { workers: false });
            expect(data.gameCount).toBe(fixtureExpected('results-mix').games * 20);
        });

        it('keeps tracker counts consistent at scale', async () => {
            const path = await repeatPgn('results-mix', 50);
            const gameTracker = new GameTracker();
            const data = await analyzePGN(path, { trackers: [gameTracker], workers: false });
            const state = getTrackerState(data, gameTracker);
            expect(data.gameCount).toBe(state.games);
            const resultsSum = Object.values(state.results).reduce((a, c) => a + c, 0);
            expect(resultsSum).toBe(data.gameCount);
        });
    });

    describe('worker-parse multi-run', () => {
        it('processes all runs without sharing detached chunk buffers', async () => {
            const trackerA = new GameTracker();
            const trackerB = new GameTracker();
            const expected = fixtureExpected('results-mix');

            const data = await analyzePGN(fixturePath('results-mix'), {
                runs: [{ trackers: [trackerA] }, { trackers: [trackerB] }],
            });

            expect(data.runs[0]?.gameCount).toBe(expected.games);
            expect(data.runs[1]?.gameCount).toBe(expected.games);
            const stateA = getTrackerState(data, trackerA, 0);
            const stateB = getTrackerState(data, trackerB, 1);
            expect(stateA.games).toBe(expected.games);
            expect(stateB.games).toBe(expected.games);
        });

        it('handles mixed filter and unfiltered runs in one pass', async () => {
            const allGames = new GameTracker();
            const whiteWins = new GameTracker();

            const data = await analyzePGN(fixturePath('results-mix'), {
                workers: false,
                runs: [
                    { trackers: [allGames] },
                    {
                        trackers: [whiteWins],
                        filter: (game: ParsedGame) => game.result === '1-0',
                    },
                ],
            });

            expect(data.runs[0]?.gameCount).toBe(fixtureExpected('results-mix').games);
            expect(data.runs[1]?.gameCount).toBe(3);
            const allState = getTrackerState(data, allGames, 0);
            const whiteState = getTrackerState(data, whiteWins, 1);
            expect(allState.games).toBe(fixtureExpected('results-mix').games);
            expect(whiteState.games).toBe(3);
        });

        it('respects per-run maxGames in multi-run', async () => {
            const capped = new GameTracker();
            const full = new GameTracker();

            const data = await analyzePGN(fixturePath('results-mix'), {
                runs: [{ trackers: [capped], maxGames: 2 }, { trackers: [full] }],
            });

            expect(data.runs[0]?.gameCount).toBe(2);
            expect(data.runs[1]?.gameCount).toBe(fixtureExpected('results-mix').games);
            const cappedState = getTrackerState(data, capped, 0);
            const fullState = getTrackerState(data, full, 1);
            expect(cappedState.games).toBe(2);
            expect(fullState.games).toBe(fixtureExpected('results-mix').games);
        });
    });

    describe('trackers on fixtures', () => {
        it('runs GameTracker on lichess-headers', async () => {
            const gameTracker = new GameTracker();
            const data = await analyzePGN(fixturePath('lichess-headers'), {
                trackers: [gameTracker],
            });
            expect(data.gameCount).toBe(1);
            const state = getTrackerState(data, gameTracker);
            expect(state.games).toBe(1);
        });

        it('runs PieceTracker on promotion', async () => {
            const pieceTracker = new PieceTracker();
            const data = await analyzePGN(fixturePath('promotion'), {
                trackers: [pieceTracker],
            });
            expect(data.gameCount).toBe(1);
            expect(data.moveCount).toBeGreaterThan(0);
        });
    });

    describe('TileTracker golden (en-passant)', () => {
        const golden = getFixtureEntry('en-passant').golden?.tileTracker;
        if (!golden) throw new Error('en-passant fixture missing tileTracker golden values');

        for (const [mode, workers] of [
            ['single-threaded', false],
            ['multithreaded', undefined],
        ] as const) {
            it(`matches golden values (${mode})`, async () => {
                const tileTracker = new TileTracker();
                const data = await analyzePGN(fixturePath('en-passant'), {
                    trackers: [tileTracker],
                    ...(workers === false ? { workers: false } : {}),
                });

                expect(data.gameCount).toBe(1);
                const state = getTrackerState(data, tileTracker);
                expect(state.movesTotal).toBe(golden.movesTotal);
                const heat = tileTracker.generateHeatmap(state, {
                    analysis: 'TILE_OCC_ALL',
                    square: 'e4',
                });
                expect(heat.map[4]?.[4]).toBe(golden.e4TileOccAll);
            });
        }

        it('counts castling as one move (rook leg excluded from move counter)', async () => {
            const tileTracker = new TileTracker();
            const data = await analyzePGN(fixturePath('en-passant'), {
                trackers: [tileTracker],
                workers: false,
            });

            const state = getTrackerState(data, tileTracker);
            expect(state.movesTotal).toBe(golden.movesTotal);
            expect(state.movesTotal).toBe(fixtureExpected('en-passant').moves);
        });
    });
});
