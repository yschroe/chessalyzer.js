import { describe, it, beforeAll, expect } from 'bun:test';

import { analyzePGN } from 'chessalyzer';
import type { AnalyzeResult } from 'chessalyzer';

import { allFixtureIds, fixturePath, getFixtureEntry } from '~/test/helpers/fixtures';

/**
 * Smoke matrix: every committed fixture parses/analyzes to the expected counts
 * in both single-threaded and multithreaded mode.
 *
 * Behavior coverage (filters, multi-run, tracker goldens) lives in sibling files.
 */
describe('Fixtures', () => {
    for (const id of allFixtureIds) {
        describe(id, () => {
            for (const [mode, workers] of [
                ['single-threaded', false],
                ['multithreaded', undefined],
            ] as const) {
                describe(mode, () => {
                    let data: AnalyzeResult;

                    beforeAll(async () => {
                        data = await analyzePGN(fixturePath(id), {
                            ...(workers === false ? { workers: false } : {}),
                        });
                    });

                    it('parses the expected number of games and moves', () => {
                        const expected = getFixtureEntry(id).expected;
                        expect(data.gameCount).toBe(expected.games);
                        expect(data.moveCount).toBe(expected.moves);
                    });
                });
            }
        });
    }
});
