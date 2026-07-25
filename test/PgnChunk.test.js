import { describe, it, expect } from 'bun:test';

import { parseGamesFromLines } from '../src/pgn/game-assembler';
import {
    chunkEndsWithCompleteGame,
    readLinesFast,
    readPgnChunks,
} from '../src/pgn/line-reader';

const SINGLE_GAME_PGN = './test/comments_singleline.pgn';
const MULTI_GAME_PGN = './test/asorted_games.pgn';

async function collectChunks(path, config) {
    const chunks = [];
    for await (const chunk of readPgnChunks(path, config)) {
        chunks.push(chunk);
    }
    return chunks;
}

describe('readPgnChunks', () => {
    it('aligns byte-target chunks to complete games', async () => {
        const chunks = [];
        for await (const chunk of readPgnChunks(MULTI_GAME_PGN, { targetBytes: 32_768 })) {
            chunks.push(chunk);
        }

        expect(chunks.length).toBeGreaterThan(1);
        for (const chunk of chunks) {
            const lines = chunk.text.split('\n');
            expect(chunkEndsWithCompleteGame(lines)).toBe(true);
        }
    });

    it('parses the same games as the line reader when chunks are combined', async () => {
        const lineGames = [];
        let game = { moves: [] };
        for await (const line of readLinesFast(SINGLE_GAME_PGN)) {
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
        for await (const chunk of readPgnChunks(SINGLE_GAME_PGN, { targetBytes: 1 })) {
            chunkGames.push(
                ...parseGamesFromLines(chunk.text.split('\n'), { readInHeader: false }),
            );
        }

        expect(chunkGames).toHaveLength(lineGames.length);
        expect(chunkGames[0].moves).toEqual(lineGames[0].moves);
    });

    it('extends past the byte target until the current game finishes', async () => {
        const chunks = await collectChunks(MULTI_GAME_PGN, {
            targetBytes: 100,
            minLines: 0,
        });
        const chunk = chunks[0];

        expect(chunk.lineCount).toBeGreaterThan(0);
        expect(chunkEndsWithCompleteGame(chunk.text.split('\n'))).toBe(true);
    });

    it('drops an incomplete trailing game at EOF', async () => {
        const incomplete = '[Event "x"]\n1. e4 e5\n';
        const path = `${import.meta.dir}/tmp-incomplete.pgn`;
        await Bun.write(path, incomplete);

        const chunks = await collectChunks(path, { targetBytes: 1 });
        expect(chunks).toHaveLength(0);

        const { unlink } = await import('node:fs/promises');
        await unlink(path);
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
