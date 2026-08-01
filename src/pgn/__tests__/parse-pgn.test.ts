import { describe, it, expect } from 'bun:test';

import { parsePGN } from '#pgn/parse-pgn';
import { fixturePath } from '~/test/helpers/fixtures';

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

    it('stops at maxGames', async () => {
        const games = await parsePGN(fixturePath('results-mix'), { maxGames: 2 });

        expect(games).toHaveLength(2);
    });

    it('drops an incomplete trailing game', async () => {
        const games = await parsePGN(fixturePath('corrupt'), { headers: true });

        expect(games).toHaveLength(1);
        expect(games[0]?.result).toBe('1-0');
    });
});
