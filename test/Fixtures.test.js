import { describe, it, beforeAll, afterAll, expect } from 'bun:test';

// Fast tests against small committed PGN fixtures (test/fixtures/).
import { Chessalyzer, GameTracker, PieceTracker } from 'chessalyzer.js';

import {
    allFixtureIds,
    cleanupTmpPgns,
    fixtureExpected,
    fixturePath,
    repeatPgn,
} from './helpers/fixtures.ts';

describe('Fixtures', () => {
    afterAll(async () => {
        await cleanupTmpPgns();
    });

    for (const id of allFixtureIds) {
        describe(id, () => {
            let data;

            beforeAll(async () => {
                data = await Chessalyzer.analyzePGN(fixturePath(id), { trackers: [] }, null);
            });

            it('parses the expected number of games and moves', () => {
                const expected = fixtureExpected(id);
                expect(data.cntGames).toBe(expected.cntGames);
                expect(data.cntMoves).toBe(expected.cntMoves);
            });
        });
    }

    describe('corrupt fixture', () => {
        it('drops the incomplete trailing game', async () => {
            const data = await Chessalyzer.analyzePGN(
                fixturePath('corrupt'),
                { trackers: [] },
                null,
            );
            expect(data.cntGames).toBe(1);
        });
    });

    describe('results_mix filtering', () => {
        it('limits by cntGames', async () => {
            const data = await Chessalyzer.analyzePGN(
                fixturePath('results_mix'),
                { config: { cntGames: 3 } },
                null,
            );
            expect(data.cntGames).toBe(3);
        });

        it('filters by result', async () => {
            const data = await Chessalyzer.analyzePGN(
                fixturePath('results_mix'),
                { config: { filter: (game) => game.Result === '1-0' } },
                null,
            );
            expect(data.cntGames).toBe(3);
        });

        it('combines filter and count', async () => {
            const data = await Chessalyzer.analyzePGN(
                fixturePath('results_mix'),
                {
                    config: {
                        cntGames: 2,
                        filter: (game) => game.Result === '0-1',
                    },
                },
                null,
            );
            expect(data.cntGames).toBe(2);
        });
    });

    describe('volume via repeated fixtures', () => {
        it('processes many games from a repeated small fixture', async () => {
            const path = await repeatPgn('results_mix', 20);
            const data = await Chessalyzer.analyzePGN(path, { trackers: [] }, null);
            expect(data.cntGames).toBe(fixtureExpected('results_mix').cntGames * 20);
        });

        it('keeps tracker counts consistent at scale', async () => {
            const path = await repeatPgn('results_mix', 50);
            const gameTracker = new GameTracker();
            const data = await Chessalyzer.analyzePGN(path, { trackers: [gameTracker] }, null);
            expect(data.cntGames).toBe(gameTracker.cntGames);
            const resultsSum = Object.values(gameTracker.results).reduce((a, c) => a + c, 0);
            expect(resultsSum).toBe(data.cntGames);
        });
    });

    describe('trackers on fixtures', () => {
        it('runs GameTracker on lichess_headers', async () => {
            const gameTracker = new GameTracker();
            const data = await Chessalyzer.analyzePGN(fixturePath('lichess_headers'), {
                trackers: [gameTracker],
            });
            expect(data.cntGames).toBe(1);
            expect(gameTracker.cntGames).toBe(1);
        });

        it('runs PieceTracker on promotion', async () => {
            const pieceTracker = new PieceTracker();
            const data = await Chessalyzer.analyzePGN(fixturePath('promotion'), {
                trackers: [pieceTracker],
            });
            expect(data.cntGames).toBe(1);
            expect(data.cntMoves).toBeGreaterThan(0);
        });
    });
});
