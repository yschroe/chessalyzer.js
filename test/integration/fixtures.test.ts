import { describe, it, beforeAll, afterAll, expect } from 'bun:test';

import { analyzePGN, GameTracker, PieceTracker } from 'chessalyzer.js';

import type { AnalyzeResult } from '../../src/types/analysis';
import type { Game } from '../../src/types/game';
import {
    allFixtureIds,
    cleanupTmpPgns,
    fixtureExpected,
    fixturePath,
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
                data = await analyzePGN(fixturePath(id), { workers: false });
            });

            it('parses the expected number of games and moves', () => {
                const expected = fixtureExpected(id);
                expect(data.games).toBe(expected.cntGames);
                expect(data.moves).toBe(expected.cntMoves);
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
        it('limits by maxGames', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                maxGames: 3,
                workers: false,
            });
            expect(data.games).toBe(3);
        });

        it('filters by result', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                filter: (game: Game) => game.Result === '1-0',
                workers: false,
            });
            expect(data.games).toBe(3);
        });

        it('combines filter and count', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                maxGames: 2,
                filter: (game: Game) => game.Result === '0-1',
                workers: false,
            });
            expect(data.games).toBe(2);
        });
    });

    describe('volume via repeated fixtures', () => {
        it('processes many games from a repeated small fixture', async () => {
            const path = await repeatPgn('results-mix', 20);
            const data = await analyzePGN(path, { workers: false });
            expect(data.games).toBe(fixtureExpected('results-mix').cntGames * 20);
        });

        it('keeps tracker counts consistent at scale', async () => {
            const path = await repeatPgn('results-mix', 50);
            const gameTracker = new GameTracker();
            const data = await analyzePGN(path, { trackers: [gameTracker], workers: false });
            expect(data.games).toBe(gameTracker.cntGames);
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

            expect(data.runs[0]?.games).toBe(expected.cntGames);
            expect(data.runs[1]?.games).toBe(expected.cntGames);
            expect(trackerA.cntGames).toBe(expected.cntGames);
            expect(trackerB.cntGames).toBe(expected.cntGames);
        });
    });

    describe('trackers on fixtures', () => {
        it('runs GameTracker on lichess-headers', async () => {
            const gameTracker = new GameTracker();
            const data = await analyzePGN(fixturePath('lichess-headers'), {
                trackers: [gameTracker],
            });
            expect(data.games).toBe(1);
            expect(gameTracker.cntGames).toBe(1);
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
});
