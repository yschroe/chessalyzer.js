import { describe, it, afterAll, expect } from 'bun:test';

import { analyzePGN } from 'chessalyzer';
import type { ParsedGame } from 'chessalyzer/pgn';
import { gameTracker } from 'chessalyzer/trackers';

import { cleanupTmpPgns, fixtureExpected, fixturePath, repeatPgn } from '~/test/helpers/fixtures';

describe('Multi-run', () => {
    it('processes all runs without sharing detached chunk buffers', async () => {
        const expected = fixtureExpected('results-mix');
        const a = gameTracker();
        const b = gameTracker();

        const data = await analyzePGN(fixturePath('results-mix'), {
            runs: [{ trackers: [a] }, { trackers: [b] }],
        });

        expect(data.runs[0]?.gameCount).toBe(expected.games);
        expect(data.runs[1]?.gameCount).toBe(expected.games);
        expect(a.state.gameCount).toBe(expected.games);
        expect(b.state.gameCount).toBe(expected.games);
    });

    it('handles mixed filter and unfiltered runs in one pass', async () => {
        const all = gameTracker();
        const whiteWins = gameTracker();
        const data = await analyzePGN(fixturePath('results-mix'), {
            workers: false,
            runs: [
                { trackers: [all] },
                {
                    trackers: [whiteWins],
                    filter: (game: ParsedGame) => game.result === '1-0',
                },
            ],
        });

        expect(data.runs[0]?.gameCount).toBe(fixtureExpected('results-mix').games);
        expect(data.runs[1]?.gameCount).toBe(3);
        expect(all.state.gameCount).toBe(fixtureExpected('results-mix').games);
        expect(whiteWins.state.gameCount).toBe(3);
    });

    it('respects per-run maxGames in multi-run', async () => {
        const capped = gameTracker();
        const full = gameTracker();
        const data = await analyzePGN(fixturePath('results-mix'), {
            runs: [{ trackers: [capped], maxGames: 2 }, { trackers: [full] }],
        });

        expect(data.runs[0]?.gameCount).toBe(2);
        expect(data.runs[1]?.gameCount).toBe(fixtureExpected('results-mix').games);
        expect(capped.state.gameCount).toBe(2);
        expect(full.state.gameCount).toBe(fixtureExpected('results-mix').games);
    });
});

describe('Volume via repeated fixtures', () => {
    afterAll(async () => {
        await cleanupTmpPgns();
    });

    it('processes many games from a repeated small fixture', async () => {
        const path = await repeatPgn('results-mix', 20);
        const data = await analyzePGN(path, { workers: false });
        expect(data.gameCount).toBe(fixtureExpected('results-mix').games * 20);
    });

    it('keeps tracker counts consistent at scale', async () => {
        const path = await repeatPgn('results-mix', 50);
        const games = gameTracker();
        const data = await analyzePGN(path, { trackers: [games], workers: false });
        expect(data.gameCount).toBe(games.state.gameCount);
        const resultsSum = Object.values(games.state.results).reduce((a, c) => a + c, 0);
        expect(resultsSum).toBe(data.gameCount);
    });
});
