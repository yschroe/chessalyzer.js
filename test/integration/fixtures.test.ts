import { describe, it, beforeAll, afterAll, expect } from 'bun:test';

import { analyzePGN, GameTracker, PieceTracker, TileTracker } from 'chessalyzer.js';

import type { AnalyzeResult } from '../../src/types/analysis';
import type { Game } from '../../src/types/game';
import {
    allFixtureIds,
    cleanupTmpPgns,
    fixtureExpected,
    fixturePath,
    getFixtureEntry,
    repeatPgn,
} from '../helpers/fixtures';

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
                expect(data.games).toBe(expected.games);
                expect(data.moves).toBe(expected.moves);
                if (expected.skippedGames !== undefined) {
                    expect(data.skippedGames).toBe(expected.skippedGames);
                }
            });
        });
    }

    describe('corrupt fixture', () => {
        it('drops the incomplete trailing game', async () => {
            const data = await analyzePGN(fixturePath('corrupt'), { workers: false });
            expect(data.games).toBe(1);
        });
    });

    describe('results-mix filtering', () => {
        it('limits by maxGames (single-threaded)', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                maxGames: 3,
                workers: false,
            });
            expect(data.games).toBe(3);
        });

        it('limits by maxGames (multithreaded)', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                maxGames: 3,
            });
            expect(data.games).toBe(3);
        });

        it('filters by result (single-threaded)', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                filter: (game: Game) => game.Result === '1-0',
                workers: false,
            });
            expect(data.games).toBe(3);
        });

        it('filters by result (multithreaded)', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                filter: (game: Game) => game.Result === '1-0',
            });
            expect(data.games).toBe(3);
        });

        it('combines filter and count (single-threaded)', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                maxGames: 2,
                filter: (game: Game) => game.Result === '0-1',
                workers: false,
            });
            expect(data.games).toBe(2);
        });

        it('combines filter and count (multithreaded)', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                maxGames: 2,
                filter: (game: Game) => game.Result === '0-1',
            });
            expect(data.games).toBe(2);
        });
    });

    describe('volume via repeated fixtures', () => {
        it('processes many games from a repeated small fixture', async () => {
            const path = await repeatPgn('results-mix', 20);
            const data = await analyzePGN(path, { workers: false });
            expect(data.games).toBe(fixtureExpected('results-mix').games * 20);
        });

        it('keeps tracker counts consistent at scale', async () => {
            const path = await repeatPgn('results-mix', 50);
            const gameTracker = new GameTracker();
            const data = await analyzePGN(path, { trackers: [gameTracker], workers: false });
            expect(data.games).toBe(gameTracker.games);
            const resultsSum = Object.values(gameTracker.results).reduce((a, c) => a + c, 0);
            expect(resultsSum).toBe(data.games);
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

            expect(data.runs[0]?.games).toBe(expected.games);
            expect(data.runs[1]?.games).toBe(expected.games);
            expect(trackerA.games).toBe(expected.games);
            expect(trackerB.games).toBe(expected.games);
        });
    });

    describe('trackers on fixtures', () => {
        it('runs GameTracker on lichess-headers', async () => {
            const gameTracker = new GameTracker();
            const data = await analyzePGN(fixturePath('lichess-headers'), {
                trackers: [gameTracker],
            });
            expect(data.games).toBe(1);
            expect(gameTracker.games).toBe(1);
        });

        it('runs PieceTracker on promotion', async () => {
            const pieceTracker = new PieceTracker();
            const data = await analyzePGN(fixturePath('promotion'), {
                trackers: [pieceTracker],
            });
            expect(data.games).toBe(1);
            expect(data.moves).toBeGreaterThan(0);
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

                expect(data.games).toBe(1);
                expect(tileTracker.movesTotal).toBe(golden.movesTotal);
                const heat = tileTracker.generateHeatmap('TILE_OCC_ALL', 'e4');
                expect(heat.map[4]?.[4]).toBe(golden.e4TileOccAll);
            });
        }

        it('counts castling as one move (rook leg excluded from move counter)', async () => {
            const tileTracker = new TileTracker();
            await analyzePGN(fixturePath('en-passant'), {
                trackers: [tileTracker],
                workers: false,
            });

            expect(tileTracker.movesTotal).toBe(golden.movesTotal);
            expect(tileTracker.movesTotal).toBe(fixtureExpected('en-passant').moves);
        });
    });
});
