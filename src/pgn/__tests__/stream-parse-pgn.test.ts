import { describe, it, expect } from 'bun:test';

import { parsePGN } from '#pgn/parse-pgn';
import { streamParsePGN } from '#pgn/stream-parse-pgn';
import { fixturePath } from '~/test/helpers/fixtures';

async function collectStream(path: string, options?: Parameters<typeof streamParsePGN>[1]) {
    const games = [];
    for await (const game of streamParsePGN(path, options)) {
        games.push(game);
    }
    return games;
}

describe('streamParsePGN', () => {
    it('yields the same games as parsePGN', async () => {
        const path = fixturePath('lichess-headers');
        const eager = await parsePGN(path, { headers: true });
        const streamed = await collectStream(path, { headers: true });

        expect(streamed).toEqual(eager);
    });

    it('parses games without headers by default', async () => {
        const games = await collectStream(fixturePath('lichess-headers'));

        expect(games).toHaveLength(1);
        expect(games[0]?.headers).toBeUndefined();
        expect(games[0]?.result).toBe('1-0');
        expect(games[0]?.moves.length).toBeGreaterThan(0);
    });

    it('parses tag-pair headers when headers is true', async () => {
        const games = await collectStream(fixturePath('lichess-headers'), { headers: true });

        expect(games).toHaveLength(1);
        expect(games[0]?.headers?.White).toBe('TestWhite');
        expect(games[0]?.headers?.Black).toBe('TestBlack');
        expect(games[0]?.headers?.ECO).toBe('C20');
    });

    it('stops at maxGames', async () => {
        const games = await collectStream(fixturePath('results-mix'), { maxGames: 2 });

        expect(games).toHaveLength(2);
    });

    it('drops an incomplete trailing game', async () => {
        const games = await collectStream(fixturePath('corrupt'), { headers: true });

        expect(games).toHaveLength(1);
        expect(games[0]?.result).toBe('1-0');
    });

    it('supports early break via return()', async () => {
        const path = fixturePath('results-mix');
        const games = [];

        const stream = streamParsePGN(path)[Symbol.asyncIterator]();
        const first = await stream.next();
        if (!first.done) games.push(first.value);
        await stream.return?.();

        expect(games).toHaveLength(1);
    });
});
