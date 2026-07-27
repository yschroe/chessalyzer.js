import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import { GameAssembler, parseGamesFromLines } from '#pgn/game-assembler';

import { fixturePath } from '../../../test/helpers/fixtures';

function linesFromFixture(id: 'lichess-headers' | 'corrupt'): string[] {
    return readFileSync(fixturePath(id), 'utf8').split('\n');
}

describe('GameAssembler', () => {
    it('reads headers when readInHeader is true', () => {
        const games = parseGamesFromLines(linesFromFixture('lichess-headers'), {
            readInHeader: true,
        });

        expect(games).toHaveLength(1);
        expect(games[0]?.White).toBe('TestWhite');
        expect(games[0]?.Black).toBe('TestBlack');
        expect(games[0]?.Result).toBe('1-0');
        expect(games[0]?.ECO).toBe('C20');
    });

    it('ignores headers when readInHeader is false', () => {
        const games = parseGamesFromLines(linesFromFixture('lichess-headers'), {
            readInHeader: false,
        });

        expect(games).toHaveLength(1);
        expect(games[0]?.White).toBeUndefined();
        expect(games[0]?.Result).toBe('1-0');
        expect(games[0]?.moves.length).toBeGreaterThan(0);
    });

    it('drops an incomplete trailing game', () => {
        const games = parseGamesFromLines(linesFromFixture('corrupt'), { readInHeader: true });

        expect(games).toHaveLength(1);
        expect(games[0]?.Result).toBe('1-0');
    });

    it('stops at maxGames', () => {
        const lines = [
            '[Event "One"]',
            '',
            '1. e4 1-0',
            '',
            '[Event "Two"]',
            '',
            '1. d4 1-0',
            '',
            '[Event "Three"]',
            '',
            '1. c4 1-0',
        ];

        const games = parseGamesFromLines(lines, { readInHeader: false, maxGames: 2 });

        expect(games).toHaveLength(2);
        expect(games[0]?.moves[0]).toBe('e4');
        expect(games[1]?.moves[0]).toBe('d4');
    });

    it('returns null until a game completes', () => {
        const assembler = new GameAssembler({ readInHeader: true });

        expect(assembler.processLine('[Event "x"]')).toBeNull();
        expect(assembler.processLine('')).toBeNull();
        expect(assembler.processLine('1. e4 e5')).toBeNull();

        const completed = assembler.processLine('2. Nf3 1-0');
        expect(completed).not.toBeNull();
        expect(completed?.moves).toEqual(['e4', 'e5', 'Nf3']);
        expect(completed?.Result).toBe('1-0');
    });
});
