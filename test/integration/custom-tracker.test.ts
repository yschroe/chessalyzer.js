import { describe, it, expect } from 'bun:test';

import { analyzePGN } from 'chessalyzer.js';

import CustomGameTracker from '../fixtures/custom-game-tracker';
import { fixtureExpected, fixturePath } from '../helpers/fixtures';

describe('Custom tracker', () => {
    it('merges custom game tracker in worker-parse mode', async () => {
        const tracker = new CustomGameTracker();
        const expected = fixtureExpected('results-mix');
        const data = await analyzePGN(fixturePath('results-mix'), {
            trackers: [tracker],
        });

        expect(data.games).toBe(expected.cntGames);
        expect(tracker.cntGames).toBe(expected.cntGames);
        expect(tracker.wins[0] + tracker.wins[1] + tracker.wins[2]).toBe(expected.cntGames);
    });
});
