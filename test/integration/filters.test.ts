import { describe, it, expect } from 'bun:test';

import { analyzePGN } from 'chessalyzer';
import type { ParsedGame } from 'chessalyzer/pgn';

import { fixturePath } from '~/test/helpers/fixtures';

describe('Filtering', () => {
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
        });
        expect(data.gameCount).toBe(3);
    });

    it('rejects filter with an explicit worker pool', () => {
        const options = {
            filter: (game: ParsedGame) => game.result === '1-0',
            workers: 2,
        };

        // @ts-expect-error - test case
        expect(analyzePGN(fixturePath('results-mix'), options)).rejects.toThrow(
            'filter cannot be used with worker threads',
        );
    });

    it('combines filter and count (single-threaded)', async () => {
        const data = await analyzePGN(fixturePath('results-mix'), {
            maxGames: 2,
            filter: (game: ParsedGame) => game.result === '0-1',
        });
        expect(data.gameCount).toBe(2);
    });
});
