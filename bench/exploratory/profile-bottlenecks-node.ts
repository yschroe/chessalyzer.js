/**
 * Lean Node-only staged profile of the parse pipeline.
 *
 * Run: bun bench/exploratory/profile-bottlenecks-node.ts
 */
import { createReadStream } from 'node:fs';
import { availableParallelism } from 'node:os';
import { performance } from 'node:perf_hooks';

import Chessalyzer from '#core/chessalyzer';
import { readLinesFast } from '#pgn/line-reader';
import GameTracker from '#tracker/game-tracker-base';
import PieceTracker from '#tracker/piece-tracker-base';
import TileTracker from '#tracker/tile/tile-tracker-base';
import type { AnalysisConfig } from '#types/analysis';

import { findLargestPgn } from '../lib/pgn-fixture';
import { formatSeconds } from '../lib/timing';

const pgn = findLargestPgn();
const HEADER_REGEX = /\[(.*?)\s"(.*?)"\]/;
const COMMENT_REGEX = /\{.*?\}|\(.*?\)/g;
const MOVE_REGEX = /[RNBQKOa-h][^\s?!#+]+/g;
const RESULT_REGEX = /-(1\/2|0|1)$/;

const mps = (moves: number, ms: number) => Math.round(moves / (ms / 1000)).toLocaleString();
const pct = (part: number, total: number) => `${((part / total) * 100).toFixed(1)}%`;

async function stageRawBytes() {
    const t0 = performance.now();
    let bytes = 0;
    for await (const chunk of createReadStream(pgn.path)) bytes += chunk.length;
    return { ms: performance.now() - t0, bytes };
}

async function stageLineReader() {
    const t0 = performance.now();
    let lines = 0;
    for await (const _ of readLinesFast(pgn.path)) lines += 1;
    return { ms: performance.now() - t0, lines };
}

async function stageTokenize(readHeader: boolean) {
    const t0 = performance.now();
    let games = 0;
    let moves = 0;
    let game: { moves: string[]; [key: string]: unknown } = { moves: [] };

    for await (const line of readLinesFast(pgn.path)) {
        if (!line) continue;
        if (line === '') continue;
        if (line.startsWith('[')) {
            if (readHeader) {
                const m = HEADER_REGEX.exec(line);
                if (m) game[m[1]!] = m[2];
            }
            continue;
        }
        const cleaned = line.replaceAll(COMMENT_REGEX, '');
        const matched = cleaned.match(MOVE_REGEX) ?? [];
        game.moves.push(...matched);
        if (RESULT_REGEX.test(cleaned)) {
            games += 1;
            moves += game.moves.length;
            game = { moves: [] };
        }
    }
    return { ms: performance.now() - t0, games, moves };
}

async function api(config: AnalysisConfig, mt: Parameters<typeof Chessalyzer.analyzePGN>[2]) {
    const t0 = performance.now();
    const result = await Chessalyzer.analyzePGN(pgn.path, config, mt);
    const ms = performance.now() - t0;
    const r = Array.isArray(result) ? result[0]! : result;
    return { ms, ...r };
}

console.log(`Runtime: node ${process.version}`);
console.log(`CPUs: ${availableParallelism()}`);
console.log(`PGN: ${pgn.path}\n`);

const raw = await stageRawBytes();
console.log(
    `1 Raw bytes          ${formatSeconds(raw.ms).padStart(9)}s  (${(raw.bytes / 1e6).toFixed(0)} MB)`,
);

const lines = await stageLineReader();
console.log(
    `2 Line reader        ${formatSeconds(lines.ms).padStart(9)}s  (${lines.lines.toLocaleString()} lines)`,
);

const tok = await stageTokenize(false);
console.log(
    `3 Tokenize no hdr    ${formatSeconds(tok.ms).padStart(9)}s  | ${mps(tok.moves, tok.ms)} moves/s`,
);

const tokH = await stageTokenize(true);
console.log(
    `4 Tokenize + hdr     ${formatSeconds(tokH.ms).padStart(9)}s  | ${mps(tokH.moves, tokH.ms)} moves/s`,
);

const multi = await api({ trackers: [] }, { targetBytes: 4 * 1024 * 1024 });
console.log(
    `5 API multi none     ${formatSeconds(multi.ms).padStart(9)}s  | ${multi.mps.toLocaleString()} moves/s`,
);

const single = await api({ trackers: [] }, null);
console.log(
    `6 API single none    ${formatSeconds(single.ms).padStart(9)}s  | ${single.mps.toLocaleString()} moves/s`,
);

const tile = await api(
    { trackers: [new TileTracker()] },
    {
        targetBytes: 4 * 1024 * 1024,
    },
);
console.log(
    `7 API multi Tile     ${formatSeconds(tile.ms).padStart(9)}s  | ${tile.mps.toLocaleString()} moves/s`,
);

const all = await api(
    {
        trackers: [new TileTracker(), new GameTracker(), new PieceTracker()],
    },
    { targetBytes: 4 * 1024 * 1024 },
);
console.log(
    `8 API multi all      ${formatSeconds(all.ms).padStart(9)}s  | ${all.mps.toLocaleString()} moves/s`,
);

console.log('\n--- Share of single-thread parse-only wall ---');
const base = single.ms;
const rows: [string, number][] = [
    ['Raw I/O', raw.ms],
    ['Line reader', lines.ms],
    ['Tokenize (no hdr)', tok.ms],
    ['Tokenize (+ hdr)', tokH.ms],
    ['API single none', single.ms],
    ['API multi none', multi.ms],
    ['API multi Tile', tile.ms],
    ['API multi all', all.ms],
];
for (const [name, ms] of rows) {
    console.log(
        `${name.padEnd(20)} ${formatSeconds(ms).padStart(9)}s  ${pct(ms, base).padStart(6)}`,
    );
}

const io = lines.ms;
const tokenizeOnly = Math.max(0, tok.ms - lines.ms);
const parseBoard = Math.max(0, single.ms - tok.ms);
console.log('\n--- Implied exclusive costs (single, no trackers) ---');
console.log(`Line I/O             ${formatSeconds(io).padStart(9)}s  ${pct(io, base)}`);
console.log(
    `Tokenize (excl I/O)  ${formatSeconds(tokenizeOnly).padStart(9)}s  ${pct(tokenizeOnly, base)}`,
);
console.log(
    `SAN+board (rest)     ${formatSeconds(parseBoard).padStart(9)}s  ${pct(parseBoard, base)}`,
);
console.log(`\nMulti speedup: ${(single.ms / multi.ms).toFixed(2)}x`);
console.log(`Tile tax vs multi: ${((tile.ms / multi.ms - 1) * 100).toFixed(0)}%`);
