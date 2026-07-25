import { describe, it, expect } from 'bun:test';

import { parseGamesFromLines } from '../src/pgn/game-assembler';
import { chunkEndsWithCompleteGame, readLinesFast, readPgnChunks } from '../src/pgn/line-reader';
import { fixturePath, repeatPgn, cleanupTmpPgns } from './helpers/fixtures.ts';

async function collectChunks(path, config) {
    const chunks = [];
    for await (const chunk of readPgnChunks(path, config)) {
        chunks.push(chunk);
    }
    return chunks;
}

describe('readPgnChunks', () => {
    it('aligns byte-target chunks to complete games', async () => {
        const volumePath = await repeatPgn('results_mix', 100);
        const chunks = await collectChunks(volumePath, { targetBytes: 32_768 });

        expect(chunks.length).toBeGreaterThan(1);
        for (const chunk of chunks) {
            expect(chunkEndsWithCompleteGame(chunk.text.split('\n'))).toBe(true);
        }
        await cleanupTmpPgns();
    });

    it('parses the same games as the line reader when chunks are combined', async () => {
        const path = fixturePath('comments_singleline');
        const lineGames = [];
        let game = { moves: [] };
        for await (const line of readLinesFast(path)) {
            if (!line.length || line.startsWith('[')) continue;
            const cleaned = line.replace(/\{.*?\}|\(.*?\)/g, '');
            const matched = cleaned.match(/[RNBQKOa-h][^\s?!#+]+/g) ?? [];
            game.moves.push(...matched);
            if (/-(1\/2|0|1)$/.test(cleaned)) {
                lineGames.push(game);
                game = { moves: [] };
            }
        }

        const chunkGames = [];
        for await (const chunk of readPgnChunks(path, { targetBytes: 1 })) {
            chunkGames.push(
                ...parseGamesFromLines(chunk.text.split('\n'), { readInHeader: false }),
            );
        }

        expect(chunkGames).toHaveLength(lineGames.length);
        expect(chunkGames[0].moves).toEqual(lineGames[0].moves);
    });

    it('extends past the byte target until the current game finishes', async () => {
        const volumePath = await repeatPgn('basic_normal', 50);
        const chunks = await collectChunks(volumePath, { targetBytes: 100, minLines: 0 });
        const chunk = chunks[0];

        expect(chunk.lineCount).toBeGreaterThan(0);
        expect(chunkEndsWithCompleteGame(chunk.text.split('\n'))).toBe(true);
        await cleanupTmpPgns();
    });

    it('drops an incomplete trailing game at EOF', async () => {
        const chunks = await collectChunks(fixturePath('corrupt'), { targetBytes: 1 });
        expect(chunks).toHaveLength(1);
        expect(chunkEndsWithCompleteGame(chunks[0].text.split('\n'))).toBe(true);
    });
});

describe('chunkEndsWithCompleteGame', () => {
    it('returns true when the last movetext line contains a result', () => {
        expect(chunkEndsWithCompleteGame(['[Event "x"]', '', '1. e4 e5 1-0'])).toBe(true);
    });

    it('returns false when the chunk ends mid-game', () => {
        expect(chunkEndsWithCompleteGame(['[Event "x"]', '', '1. e4 e5'])).toBe(false);
    });
});
