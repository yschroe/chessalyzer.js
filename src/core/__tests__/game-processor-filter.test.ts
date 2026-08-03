import { afterEach, describe, expect, it, spyOn } from 'bun:test';

import { normalizeAnalyzeOptions } from '#core/analysis-config';
import GameProcessor from '#core/game-processor';
import * as toParsedGameModule from '#pgn/to-parsed-game';
import { gameTracker } from '#trackers/game-tracker';
import { fixtureExpected, fixturePath } from '~/test/helpers/fixtures';

describe('GameProcessor filter materialization', () => {
    afterEach(() => {
        spyOn(toParsedGameModule, 'toParsedGame').mockRestore();
    });

    it('materializes ParsedGame once per game across filtered multi-run passes', async () => {
        const spy = spyOn(toParsedGameModule, 'toParsedGame');

        const white = gameTracker();
        const black = gameTracker();
        const draws = gameTracker();

        const normalized = normalizeAnalyzeOptions({
            workers: false,
            runs: [
                { trackers: [white], filter: (g) => g.result === '1-0' },
                { trackers: [black], filter: (g) => g.result === '0-1' },
                { trackers: [draws], filter: (g) => g.result === '1/2-1/2' },
            ],
        });

        const processor = new GameProcessor(normalized);
        await processor.processPGN(fixturePath('results-mix'));

        const expectedGames = fixtureExpected('results-mix').games;
        expect(spy.mock.calls.length).toBe(expectedGames);
    });

    it('reuses ParsedGame between filter and game tracker in the same run', async () => {
        const spy = spyOn(toParsedGameModule, 'toParsedGame');

        const games = gameTracker();
        const normalized = normalizeAnalyzeOptions({
            workers: false,
            trackers: [games],
            filter: (g) => g.result === '1-0',
        });

        const processor = new GameProcessor(normalized);
        await processor.processPGN(fixturePath('results-mix'));

        expect(games.state.games).toBeGreaterThan(0);
        expect(spy.mock.calls.length).toBe(fixtureExpected('results-mix').games);
    });
});
