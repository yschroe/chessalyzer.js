import { describe, it, expect } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readLines } from '#io/line-reader';
import { decodePgnChunkLines, readPgnChunks, type PgnChunkConfig } from '#io/pgn-chunks';
import { parseGamesFromLines } from '#pgn/game-assembler';
import { extractGameResult, stripComments } from '#pgn/movetext';
import { fixturePath, repeatPgn, cleanupTmpPgns } from '~/test/helpers/fixtures';

/** Index of the last movetext line that completes a game, or -1 if none. */
function findLastCompleteGameLineIndex(lines: string[]): number {
    for (let i = lines.length - 1; i >= 0; i -= 1) {
        const line = lines[i];
        if (line === undefined || line === '') continue;
        if (line.startsWith('[')) continue;
        if (extractGameResult(stripComments(line)) !== null) return i;
    }
    return -1;
}

/** True when the last movetext line in the chunk completes a game. */
function chunkEndsWithCompleteGame(lines: string[]): boolean {
    const lastResultIdx = findLastCompleteGameLineIndex(lines);
    if (lastResultIdx === -1) return false;

    for (let i = lastResultIdx + 1; i < lines.length; i += 1) {
        const line = lines[i];
        if (line === undefined || line === '') continue;
        if (line.startsWith('[')) continue;
        return false;
    }

    return true;
}

function chunkLines(chunk: { bytes: Uint8Array }): string[] {
    return decodePgnChunkLines(chunk.bytes);
}

async function collectChunks(path: string, config: PgnChunkConfig) {
    const chunks = [];
    for await (const chunk of readPgnChunks(path, config)) {
        chunks.push(chunk);
    }
    return chunks;
}

describe('readPgnChunks', () => {
    it('agrees with assembly on result suffixes, whitespace, comments, and unfinished lines', async () => {
        const lines = [
            '[Event "Suffixes"]',
            '1. e4 {1-0} e5 (0-1)',
            '2. Nf3 Nc6 1-0\t {finished}',
            '1. d4 d5 0-1\u00a0',
            '1. c4 e5 1/2-1/2\u2028\ufeff',
            '1. Nf3 d5* (finished)',
            '1. e4 e5 1-0!',
        ];
        const expected = parseGamesFromLines(lines, { parseHeaders: true });
        expect(expected.map((game) => game.result)).toEqual(['1-0', '0-1', '1/2-1/2', '*']);
        expect(expected[0]?.moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
        const dir = await mkdtemp(join(tmpdir(), 'chessalyzer-results-'));
        try {
            const path = join(dir, 'results.pgn');
            await writeFile(path, lines.join('\n'));
            const chunkSets = await Promise.all(
                [{ targetBytes: 1 }, { maxLines: 4 }, {}].map((config) =>
                    collectChunks(path, config),
                ),
            );
            for (const chunks of chunkSets) {
                const games = chunks.flatMap((chunk) =>
                    parseGamesFromLines(chunkLines(chunk), { parseHeaders: true }),
                );
                expect(games).toEqual(expected);
            }
        } finally {
            await rm(dir, { recursive: true });
        }
    });

    it('aligns byte-target chunks to complete games', async () => {
        const volumePath = await repeatPgn('results-mix', 100);
        const chunks = await collectChunks(volumePath, { targetBytes: 32_768 });

        expect(chunks.length).toBeGreaterThan(1);
        for (const chunk of chunks) {
            expect(chunkEndsWithCompleteGame(chunkLines(chunk))).toBe(true);
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
            chunkGames.push(...parseGamesFromLines(chunkLines(chunk), { parseHeaders: false }));
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

        expect(chunk.bytes.byteLength).toBeGreaterThan(0);
        expect(chunkEndsWithCompleteGame(chunkLines(chunk))).toBe(true);
        await cleanupTmpPgns();
    });

    it('drops an incomplete trailing game at EOF', async () => {
        const chunks = await collectChunks(fixturePath('corrupt'), { targetBytes: 1 });
        expect(chunks).toHaveLength(1);
        const chunk = chunks[0];
        expect(chunk).toBeDefined();
        if (!chunk) return;
        expect(chunkEndsWithCompleteGame(chunkLines(chunk))).toBe(true);
    });

    it('emits a complete game before an incomplete trailing game with default chunk size', async () => {
        const chunks = await collectChunks(fixturePath('corrupt'), {});
        expect(chunks).toHaveLength(1);
        const [chunk] = chunks;
        expect(chunk).toBeDefined();
        if (!chunk) return;
        const games = parseGamesFromLines(chunkLines(chunk), { parseHeaders: true });
        expect(games).toHaveLength(1);
        expect(games[0]?.result).toBe('1-0');
    });
});

/** Games as the single-threaded path assembles them (readline lines → assembler). */
async function lineReaderGames(path: string) {
    const lines: string[] = [];
    await readLines(path, (line) => {
        lines.push(line);
    });
    return parseGamesFromLines(lines, { parseHeaders: true });
}

async function chunkedGames(path: string, config: PgnChunkConfig) {
    const chunks = await collectChunks(path, config);
    for (const chunk of chunks) {
        // Transfer to workers is zero-copy only when the view owns its whole buffer.
        expect(chunk.bytes.byteOffset).toBe(0);
        expect(chunk.bytes.byteLength).toBe(chunk.bytes.buffer.byteLength);
    }
    return chunks.flatMap((chunk) =>
        parseGamesFromLines(chunkLines(chunk), { parseHeaders: true }),
    );
}

const EQUIVALENCE_CONFIGS: PgnChunkConfig[] = [
    {},
    { targetBytes: 1 },
    { targetBytes: 100 },
    { maxLines: 3 },
    { targetBytes: 1, minLines: 7 },
];

describe('readPgnChunks equivalence with the line reader', () => {
    it.each([
        'basic-normal',
        'comments-multiline',
        'comments-singleline',
        'corrupt',
        'crlf-endings',
        'lichess-headers',
        'chessdotcom-headers',
        'results-mix',
    ] as const)('assembles the same games from %s', async (id) => {
        const expected = await lineReaderGames(fixturePath(id));
        const results = await Promise.all(
            EQUIVALENCE_CONFIGS.map((config) => chunkedGames(fixturePath(id), config)),
        );
        for (const actual of results) {
            expect(actual).toEqual(expected);
        }
    });

    it('handles BOM, lone CR, CRLF, Unicode whitespace, multi-byte text across reads, and no final newline', async () => {
        // Each game carries > 64 KiB of multi-byte comment text so cuts and reads land mid-sequence.
        const comment = `{${'Zug ♞ über “ñ” 🐴 '.repeat(4_000)}}`;
        const games = [
            `[Event "BOM"]\n[Result "1-0"]\n\n1. e4 ${comment} e5 2. Nf3 1-0\n\n`,
            `[Event "CRLF"]\r\n\r\n1. d4 d5\r\n2. c4 0-1 \r\n\r\n`,
            `[Event "Lone CR"]\r\r1. c4 ${comment}\r1... e5 1/2-1/2\r\r`,
            `[Event "Header result"]\n[Result "1-0"]\n\n1. Nf3 d5 ${comment}\n2. g3 *`,
        ];
        const dir = await mkdtemp(join(tmpdir(), 'chessalyzer-bytes-'));
        try {
            const path = join(dir, 'edge.pgn');
            await writeFile(path, `\uFEFF${games.join('')}`);
            const expected = await lineReaderGames(path);
            expect(expected.map((game) => game.result)).toEqual(['1-0', '0-1', '1/2-1/2', '*']);
            const results = await Promise.all(
                [...EQUIVALENCE_CONFIGS, { targetBytes: 70_000 }].map((config) =>
                    chunkedGames(path, config),
                ),
            );
            for (const actual of results) {
                // readline keeps the BOM, so its first header line parses as movetext;
                // worker decoding drops the BOM (as it did before byte-level chunking).
                expect(actual.slice(1)).toEqual(expected.slice(1));
                expect(actual[0]?.moves).toEqual(['e4', 'e5', 'Nf3']);
                expect(actual[0]?.headers).toEqual({ Event: 'BOM', Result: '1-0' });
            }
        } finally {
            await rm(dir, { recursive: true });
        }
    });

    it('extends a line-capped chunk until a long game completes', async () => {
        const movetext = Array.from({ length: 200 }, (_, i) => `${i + 1}. Nf3 Nf6`).join('\n');
        const dir = await mkdtemp(join(tmpdir(), 'chessalyzer-long-'));
        try {
            const path = join(dir, 'long.pgn');
            await writeFile(
                path,
                `[Event "Long"]\n\n${movetext}\n1-0\n\n[Event "Next"]\n\n1. e4 0-1\n`,
            );
            const chunks = await collectChunks(path, { maxLines: 10 });
            const games = chunks.flatMap((chunk) =>
                parseGamesFromLines(chunkLines(chunk), { parseHeaders: true }),
            );
            expect(games.map((game) => game.moves.length)).toEqual([400, 1]);
        } finally {
            await rm(dir, { recursive: true });
        }
    });

    it('rejects when the file does not exist', async () => {
        const missing = join(tmpdir(), 'chessalyzer-missing-file.pgn');
        expect(collectChunks(missing, {})).rejects.toThrow();
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
