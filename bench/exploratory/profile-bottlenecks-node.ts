/**
 * Lean Node-only staged profile of the I/O → PGN parse → analyze pipeline.
 *
 * Run: bun bench/exploratory/profile-bottlenecks-node.ts
 */
import { createReadStream } from 'node:fs';
import { availableParallelism } from 'node:os';

import { analyzePGN } from '#core/analyze';
import { readLines } from '#io/line-reader';
import { GameTracker } from '#trackers/game-tracker';
import { PieceTracker } from '#trackers/piece-tracker';
import { TileTracker } from '#trackers/tile/tile-tracker';
import type { AnalyzeSingleRunOptions } from '#types/analysis';
import { findLargestPgn } from '~/bench/lib/pgn-fixture';
import { getRuntimeLabel } from '~/bench/lib/report';
import { formatSeconds, timeAsync } from '~/bench/lib/timing';

const pgn = findLargestPgn();
const HEADER_REGEX = /\[(.*?)\s"(.*?)"\]/;
const COMMENT_REGEX = /\{.*?\}|\(.*?\)/g;
const MOVE_REGEX = /[RNBQKOa-h][^\s?!#+]+/g;
const RESULT_REGEX = /-(1\/2|0|1)$/;

const mps = (moves: number, ms: number) => Math.round(moves / (ms / 1000)).toLocaleString();
const pct = (part: number, total: number) => `${((part / total) * 100).toFixed(1)}%`;

async function stageRawBytes() {
    const { ms, result: bytes } = await timeAsync(async () => {
        let total = 0;
        for await (const chunk of createReadStream(pgn.path)) total += chunk.length;
        return total;
    });
    return { ms, bytes };
}

async function stageLineReader() {
    const { ms, result: lines } = await timeAsync(async () => {
        let count = 0;
        await readLines(pgn.path, () => {
            count += 1;
        });
        return count;
    });
    return { ms, lines };
}

async function stagePgnParse(readHeader: boolean) {
    const { ms, result } = await timeAsync(async () => {
        let games = 0;
        let moves = 0;
        let game: { moves: string[]; [key: string]: unknown } = { moves: [] };

        await readLines(pgn.path, (line) => {
            if (!line) return;
            if (line === '') return;
            if (line.startsWith('[')) {
                if (readHeader) {
                    const m = HEADER_REGEX.exec(line);
                    if (m) game[m[1]!] = m[2];
                }
                return;
            }
            const cleaned = line.replaceAll(COMMENT_REGEX, '');
            const matched = cleaned.match(MOVE_REGEX) ?? [];
            game.moves.push(...matched);
            if (RESULT_REGEX.test(cleaned)) {
                games += 1;
                moves += game.moves.length;
                game = { moves: [] };
            }
        });
        return { games, moves };
    });
    return { ms, games: result.games, moves: result.moves };
}

async function api(options: AnalyzeSingleRunOptions) {
    const { ms, result } = await timeAsync(() => analyzePGN(pgn.path, options));
    return {
        ms,
        cntGames: result.gameCount,
        cntMoves: result.moveCount,
        mps: result.movesPerSecond,
    };
}

console.log(`Runtime: ${getRuntimeLabel()}`);
console.log(`CPUs: ${availableParallelism()}`);
console.log(`PGN: ${pgn.path}\n`);

const raw = await stageRawBytes();
console.log(
    `1 Raw I/O            ${formatSeconds(raw.ms).padStart(9)}s  (${(raw.bytes / 1e6).toFixed(0)} MB)`,
);

const lines = await stageLineReader();
console.log(
    `2 Line I/O           ${formatSeconds(lines.ms).padStart(9)}s  (${lines.lines.toLocaleString()} lines)`,
);

const pgnParse = await stagePgnParse(false);
console.log(
    `3 PGN parse (no hdr) ${formatSeconds(pgnParse.ms).padStart(9)}s  | ${mps(pgnParse.moves, pgnParse.ms)} moves/s`,
);

const pgnParseHdr = await stagePgnParse(true);
console.log(
    `4 PGN parse (+ hdr)  ${formatSeconds(pgnParseHdr.ms).padStart(9)}s  | ${mps(pgnParseHdr.moves, pgnParseHdr.ms)} moves/s`,
);

const multi = await api({ trackers: [], workers: { targetBytes: 4 * 1024 * 1024 } });
console.log(
    `5 Analyze E2E (multi, no trackers) ${formatSeconds(multi.ms).padStart(9)}s  | ${multi.mps.toLocaleString()} moves/s`,
);

const single = await api({ trackers: [], workers: false });
console.log(
    `6 Analyze E2E (single, no trackers) ${formatSeconds(single.ms).padStart(9)}s  | ${single.mps.toLocaleString()} moves/s`,
);

const tile = await api({
    trackers: [new TileTracker()],
    workers: { targetBytes: 4 * 1024 * 1024 },
});
console.log(
    `7 Analyze E2E (multi, Tile) ${formatSeconds(tile.ms).padStart(9)}s  | ${tile.mps.toLocaleString()} moves/s`,
);

const all = await api({
    trackers: [new TileTracker(), new GameTracker(), new PieceTracker()],
    workers: { targetBytes: 4 * 1024 * 1024 },
});
console.log(
    `8 Analyze E2E (multi, all trackers) ${formatSeconds(all.ms).padStart(9)}s  | ${all.mps.toLocaleString()} moves/s`,
);

console.log('\n--- Share of single-thread analyze E2E wall ---');
const base = single.ms;
const rows: [string, number][] = [
    ['Raw I/O', raw.ms],
    ['Line I/O', lines.ms],
    ['PGN parse (no hdr)', pgnParse.ms],
    ['PGN parse (+ hdr)', pgnParseHdr.ms],
    ['Analyze E2E (single)', single.ms],
    ['Analyze E2E (multi)', multi.ms],
    ['Analyze E2E (multi, Tile)', tile.ms],
    ['Analyze E2E (multi, all)', all.ms],
];
for (const [name, ms] of rows) {
    console.log(
        `${name.padEnd(28)} ${formatSeconds(ms).padStart(9)}s  ${pct(ms, base).padStart(6)}`,
    );
}

const io = lines.ms;
const pgnParseOnly = Math.max(0, pgnParse.ms - lines.ms);
const e2eOverhead = Math.max(0, single.ms - pgnParse.ms);
console.log('\n--- Implied exclusive costs (single, no trackers) ---');
console.log(`Line I/O                     ${formatSeconds(io).padStart(9)}s  ${pct(io, base)}`);
console.log(
    `PGN parse (excl I/O)         ${formatSeconds(pgnParseOnly).padStart(9)}s  ${pct(pgnParseOnly, base)}`,
);
console.log(
    `E2E overhead (rest)          ${formatSeconds(e2eOverhead).padStart(9)}s  ${pct(e2eOverhead, base)}`,
);
console.log(`\nMulti speedup: ${(single.ms / multi.ms).toFixed(2)}x`);
console.log(`Tile tax vs multi: ${((tile.ms / multi.ms - 1) * 100).toFixed(0)}%`);
