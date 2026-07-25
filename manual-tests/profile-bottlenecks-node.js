/**
 * Lean Node-only staged profile.
 * Run: node manual-tests/profile-bottlenecks-node.js
 */
import { createReadStream } from 'node:fs';
import { availableParallelism } from 'node:os';
import { performance } from 'node:perf_hooks';

import { Chessalyzer, TileTracker, GameTracker, PieceTracker } from '../lib/index.js';

const PGN = './manual-tests/lichess_db_standard_rated_2013-12.pgn';
const HEADER_REGEX = /\[(.*?)\s"(.*?)"\]/;
const COMMENT_REGEX = /\{.*?\}|\(.*?\)/g;
const MOVE_REGEX = /[RNBQKOa-h][^\s?!#+]+/g;
const RESULT_REGEX = /-(1\/2|0|1)$/;

const fmt = (ms) => `${(ms / 1000).toFixed(3)}s`;
const mps = (moves, ms) => Math.round(moves / (ms / 1000)).toLocaleString();
const pct = (part, total) => `${((part / total) * 100).toFixed(1)}%`;

/** Minimal copy of readLinesFast (same algorithm as src/core/line-reader.ts). */
function readLinesFast(file) {
    const rs = createReadStream(file, { encoding: 'utf-8' });
    const iterator = rs[Symbol.asyncIterator]();
    const cache = [];
    let lineBreak = false;
    let pending = null;

    const next = async () => {
        let line = cache.shift() ?? null;
        if (cache.length === 0) {
            const { value, done } = await iterator.next();
            if (!done) {
                const lines = value.replace(/\r/g, '').split('\n');
                if (line !== null && !lineBreak) line += lines.shift();
                if (line === null) line = lines.shift();
                cache.push(...lines);
                lineBreak = value.at(-1) === '\n';
            }
        }
        if (line !== null) return { value: line, done: false };
        return { done: true };
    };

    return { [Symbol.asyncIterator]: () => ({ next }) };
}

async function stageRawBytes() {
    const t0 = performance.now();
    let bytes = 0;
    for await (const chunk of createReadStream(PGN)) bytes += chunk.length;
    return { ms: performance.now() - t0, bytes };
}

async function stageLineReader() {
    const t0 = performance.now();
    let lines = 0;
    for await (const _ of readLinesFast(PGN)) lines += 1;
    return { ms: performance.now() - t0, lines };
}

async function stageTokenize(readHeader) {
    const t0 = performance.now();
    let games = 0;
    let moves = 0;
    let game = { moves: [] };

    for await (const line of readLinesFast(PGN)) {
        if (line === '') continue;
        if (line.startsWith('[')) {
            if (readHeader) {
                const m = HEADER_REGEX.exec(line);
                if (m) game[m[1]] = m[2];
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

async function api(configs, mt) {
    const t0 = performance.now();
    const result = await Chessalyzer.analyzePGN(PGN, configs, mt);
    const ms = performance.now() - t0;
    const r = Array.isArray(result) ? result[0] : result;
    return { ms, ...r };
}

async function main() {
    console.log(`Runtime: node ${process.version}`);
    console.log(`CPUs: ${availableParallelism()}`);
    console.log(`PGN: ${PGN}\n`);

    const raw = await stageRawBytes();
    console.log(`1 Raw bytes          ${fmt(raw.ms)}  (${(raw.bytes / 1e6).toFixed(0)} MB)`);

    const lines = await stageLineReader();
    console.log(`2 Line reader        ${fmt(lines.ms)}  (${lines.lines.toLocaleString()} lines)`);

    const tok = await stageTokenize(false);
    console.log(`3 Tokenize no hdr    ${fmt(tok.ms)}  | ${mps(tok.moves, tok.ms)} moves/s`);

    const tokH = await stageTokenize(true);
    console.log(`4 Tokenize + hdr     ${fmt(tokH.ms)}  | ${mps(tokH.moves, tokH.ms)} moves/s`);

    const multi = await api({ trackers: [] }, { targetBytes: 4 * 1024 * 1024 });
    console.log(`5 API multi none     ${fmt(multi.ms)}  | ${multi.mps.toLocaleString()} moves/s`);

    const single = await api({ trackers: [] }, null);
    console.log(`6 API single none    ${fmt(single.ms)}  | ${single.mps.toLocaleString()} moves/s`);

    const tile = await api({ trackers: [new TileTracker()] }, { targetBytes: 4 * 1024 * 1024 });
    console.log(`7 API multi Tile     ${fmt(tile.ms)}  | ${tile.mps.toLocaleString()} moves/s`);

    const all = await api(
        { trackers: [new TileTracker(), new GameTracker(), new PieceTracker()] },
        { targetBytes: 4 * 1024 * 1024 },
    );
    console.log(`8 API multi all      ${fmt(all.ms)}  | ${all.mps.toLocaleString()} moves/s`);

    console.log('\n--- Share of single-thread parse-only wall ---');
    const base = single.ms;
    const rows = [
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
        console.log(`${name.padEnd(20)} ${fmt(ms).padStart(8)}  ${pct(ms, base).padStart(6)}`);
    }

    // Approximate exclusive costs for single-thread parse-only:
    // line I/O ⊆ tokenize ⊆ full parse
    const io = lines.ms;
    const tokenizeOnly = Math.max(0, tok.ms - lines.ms);
    const parseBoard = Math.max(0, single.ms - tok.ms);
    console.log('\n--- Implied exclusive costs (single, no trackers) ---');
    console.log(`Line I/O             ${fmt(io)}  ${pct(io, base)}`);
    console.log(`Tokenize (excl I/O)  ${fmt(tokenizeOnly)}  ${pct(tokenizeOnly, base)}`);
    console.log(`SAN+board (rest)     ${fmt(parseBoard)}  ${pct(parseBoard, base)}`);
    console.log(`\nMulti speedup: ${(single.ms / multi.ms).toFixed(2)}x`);
    console.log(`Tile tax vs multi: ${((tile.ms / multi.ms - 1) * 100).toFixed(0)}%`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
