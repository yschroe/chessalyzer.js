import { describe, it, expect } from 'bun:test';

import { parsePGN, streamParsePGN } from 'chessalyzer.js/pgn';

import { allFixtureIds, fixtureExpected, fixturePath } from '../helpers/fixtures';

async function collectStream(path: string, options?: Parameters<typeof streamParsePGN>[1]) {
    const games = [];
    for await (const game of streamParsePGN(path, options)) {
        games.push(game);
    }
    return games;
}

describe('parsePGN', () => {
    it('parses games without headers by default', async () => {
        const games = await parsePGN(fixturePath('lichess-headers'));

        expect(games).toHaveLength(1);
        expect(games[0]?.headers).toBeUndefined();
        expect(games[0]?.result).toBe('1-0');
        expect(games[0]?.moves.length).toBeGreaterThan(0);
    });

    it('parses tag-pair headers when headers is true', async () => {
        const games = await parsePGN(fixturePath('lichess-headers'), { headers: true });

        expect(games).toHaveLength(1);
        expect(games[0]?.headers?.White).toBe('TestWhite');
        expect(games[0]?.headers?.Black).toBe('TestBlack');
        expect(games[0]?.headers?.ECO).toBe('C20');
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
        expect(games[0]?.result).toBe('1-0');
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

describe('streamParsePGN', () => {
    it('yields the same games as parsePGN on built package', async () => {
        const path = fixturePath('basic-normal');
        const eager = await parsePGN(path);
        const streamed = await collectStream(path);

        expect(streamed).toEqual(eager);
    });

    for (const id of allFixtureIds) {
        it(`${id}: matches fixture game and move counts`, async () => {
            const games = await collectStream(fixturePath(id));

            const expected = fixtureExpected(id);
            expect(games).toHaveLength(expected.games);

            const moveCount = games.reduce((sum, game) => sum + game.moves.length, 0);
            expect(moveCount).toBe(expected.moves);
        });
    }
});
