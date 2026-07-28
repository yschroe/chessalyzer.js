import { describe, it, expect } from 'bun:test';

import { parsePGN } from 'chessalyzer.js';

import { allFixtureIds, fixtureExpected, fixturePath } from '../helpers/fixtures';

describe('parsePGN', () => {
    it('is available from chessalyzer.js/pgn subpath', async () => {
        const { parsePGN: parseFromSubpath } = await import('chessalyzer.js/pgn');
        const games = await parseFromSubpath(fixturePath('basic-normal'));
        expect(games).toHaveLength(1);
    });

    it('parses games without headers by default', async () => {
        const games = await parsePGN(fixturePath('lichess-headers'));

        expect(games).toHaveLength(1);
        expect(games[0]?.White).toBeUndefined();
        expect(games[0]?.Result).toBe('1-0');
        expect(games[0]?.moves.length).toBeGreaterThan(0);
    });

    it('parses tag-pair headers when headers is true', async () => {
        const games = await parsePGN(fixturePath('lichess-headers'), { headers: true });

        expect(games).toHaveLength(1);
        expect(games[0]?.White).toBe('TestWhite');
        expect(games[0]?.Black).toBe('TestBlack');
        expect(games[0]?.ECO).toBe('C20');
    });

    it('returns mainline SAN strings only (no board replay)', async () => {
        const games = await parsePGN(fixturePath('basic-normal'));

        expect(games).toHaveLength(1);
        expect(typeof games[0]?.moves[0]).toBe('string');
        expect(games[0]?.moves[0]).toBe('e4');
    });

    it('stops at maxGames', async () => {
        const games = await parsePGN(fixturePath('results-mix'), { maxGames: 2 });

        expect(games).toHaveLength(2);
    });

    it('drops an incomplete trailing game', async () => {
        const games = await parsePGN(fixturePath('corrupt'), { headers: true });

        expect(games).toHaveLength(1);
        expect(games[0]?.Result).toBe('1-0');
    });

    for (const id of allFixtureIds) {
        it(`${id}: matches fixture game and move counts`, async () => {
            const games = await parsePGN(fixturePath(id));

            const expected = fixtureExpected(id);
            expect(games).toHaveLength(expected.games);

            const moveCount = games.reduce((sum, game) => sum + game.moves.length, 0);
            expect(moveCount).toBe(expected.moves);
        });
    }
});
