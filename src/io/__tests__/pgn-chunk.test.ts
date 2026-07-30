import { describe, it, expect } from 'bun:test';

import { readLines } from '#io/line-reader';
import { chunkEndsWithCompleteGame, readPgnChunks, type PgnChunkConfig } from '#io/pgn-chunks';
import { parseGamesFromLines } from '#pgn/game-assembler';

import { fixturePath, repeatPgn, cleanupTmpPgns } from '../../../test/helpers/fixtures';

async function collectChunks(path: string, config: PgnChunkConfig) {
    const chunks = [];
    for await (const chunk of readPgnChunks(path, config)) {
        chunks.push(chunk);
    }
    return chunks;
}

describe('readPgnChunks', () => {
    it('aligns byte-target chunks to complete games', async () => {
        const volumePath = await repeatPgn('results-mix', 100);
        const chunks = await collectChunks(volumePath, { targetBytes: 32_768 });

        expect(chunks.length).toBeGreaterThan(1);
        for (const chunk of chunks) {
            expect(chunkEndsWithCompleteGame(chunk.text.split('\n'))).toBe(true);
        }
        await cleanupTmpPgns();
    });

    it('parses the same games as the line reader when chunks are combined', async () => {
        const path = fixturePath('comments-singleline');
        const lineGames: { moves: string[] }[] = [];
        let game: { moves: string[] } = { moves: [] };
        await readLines(path, (line) => {
            if (!line.length || line.startsWith('[')) return;
            const cleaned = line.replace(/\{.*?\}|\(.*?\)/g, '');
            const matched = cleaned.match(/[RNBQKOa-h][^\s?!#+]+/g) ?? [];
            game.moves.push(...matched);
            if (/-(1\/2|0|1)$/.test(cleaned)) {
                lineGames.push(game);
                game = { moves: [] };
            }
        });

        const chunkGames = [];
        for await (const chunk of readPgnChunks(path, { targetBytes: 1 })) {
            chunkGames.push(
                ...parseGamesFromLines(chunk.text.split('\n'), { parseHeaders: false }),
            );
        }

        expect(chunkGames).toHaveLength(lineGames.length);
        const firstLineGame = lineGames[0];
        const firstChunkGame = chunkGames[0];
        expect(firstLineGame).toBeDefined();
        expect(firstChunkGame).toBeDefined();
        expect(firstChunkGame?.moves).toEqual(firstLineGame?.moves);
    });

    it('extends past the byte target until the current game finishes', async () => {
        const volumePath = await repeatPgn('basic-normal', 50);
        const chunks = await collectChunks(volumePath, { targetBytes: 100, minLines: 0 });
        const chunk = chunks[0];
        expect(chunk).toBeDefined();
        if (!chunk) return;

        expect(chunk.lineCount).toBeGreaterThan(0);
        expect(chunkEndsWithCompleteGame(chunk.text.split('\n'))).toBe(true);
        await cleanupTmpPgns();
    });

    it('drops an incomplete trailing game at EOF', async () => {
        const chunks = await collectChunks(fixturePath('corrupt'), { targetBytes: 1 });
        expect(chunks).toHaveLength(1);
        const chunk = chunks[0];
        expect(chunk).toBeDefined();
        if (!chunk) return;
        expect(chunkEndsWithCompleteGame(chunk.text.split('\n'))).toBe(true);
    });

    it('emits a complete game before an incomplete trailing game with default chunk size', async () => {
        const chunks = await collectChunks(fixturePath('corrupt'), {});
        expect(chunks).toHaveLength(1);
        const [chunk] = chunks;
        expect(chunk).toBeDefined();
        if (!chunk) return;
        const games = parseGamesFromLines(chunk.text.split('\n'), { parseHeaders: true });
        expect(games).toHaveLength(1);
        expect(games[0]?.result).toBe('1-0');
    });
});

describe('chunkEndsWithCompleteGame', () => {
    it('returns true when the last movetext line contains a result', () => {
        expect(chunkEndsWithCompleteGame(['[Event "x"]', '', '1. e4 e5 1-0'])).toBe(true);
    });

    it('returns false when the chunk ends mid-game', () => {
        expect(chunkEndsWithCompleteGame(['[Event "x"]', '', '1. e4 e5'])).toBe(false);
    });

    it('finds the last complete game when a trailing game is incomplete', () => {
        const lines = [
            '[Event "Complete"]',
            '',
            '1. e4 1-0',
            '',
            '[Event "Incomplete"]',
            '',
            '1. d4 d5',
        ];
        expect(chunkEndsWithCompleteGame(lines)).toBe(false);
    });
});
