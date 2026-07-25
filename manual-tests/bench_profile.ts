/**
 * Profile split: where time goes in the PGN → WASM pipeline.
 *
 * Uses ONE streaming pass for the full-file breakdown (matches production),
 * plus a small game sample for tracker-path sub-phases (encode vs decode).
 *
 * Usage:
 *   bun manual-tests/bench_profile.ts [path/to/file.pgn]
 *   bun manual-tests/bench_profile.ts --sample 10000 path/to/file.pgn
 *   bun manual-tests/bench_profile.ts --full-sample path/to/file.pgn  # slow: tracker split on all games
 */

import { statSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import ChessBoard from '../src/js/core/chess-board.ts';
import { decodeProcessedGame } from '../src/js/core/processed-game.ts';
import type { ProcessedGameData } from '../src/js/core/processed-game.ts';
import { readLinesFast } from '../src/js/core/line-reader.ts';
import type { Game } from '../src/js/interfaces/index.ts';
import { Board } from '../pkg/bitboard.js';

const DEFAULT_PGN = './manual-tests/lichess_db_standard_rated_2013-12.pgn';
const DEFAULT_SAMPLE = 5_000;
const PROGRESS_EVERY_GAMES = 50_000;

const COMMENT_REGEX = /\{.*?\}|\(.*?\)/g;
const MOVE_REGEX = /[RNBQKOa-h][^\s?!#+]+/g;
const RESULT_REGEX = /-(1\/2|0|1)$/;

interface PhaseResult {
    ms: number;
    games: number;
    moves: number;
    lines?: number;
}

function parseArgs(argv: string[]) {
    let path = DEFAULT_PGN;
    let sampleSize = DEFAULT_SAMPLE;
    let fullSample = false;

    for (let i = 2; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--full-sample') {
            fullSample = true;
        } else if (arg === '--sample') {
            sampleSize = Number(argv[++i]);
        } else if (!arg.startsWith('-')) {
            path = arg;
        }
    }

    return { path, sampleSize: fullSample ? Infinity : sampleSize, fullSample };
}

function msPerMove(ms: number, moves: number) {
    return moves > 0 ? ((ms / moves) * 1_000_000).toFixed(0) : '—';
}

function pct(part: number, total: number) {
    return total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';
}

function log(msg: string) {
    process.stdout.write(`${msg}\n`);
}

/**
 * Single streaming pass over the PGN file.
 * Times WASM at game boundaries only (no per-line clock calls).
 * Read time comes from a separate read-only pass.
 */
async function benchReadOnly(path: string): Promise<PhaseResult> {
    let lines = 0;
    const start = performance.now();
    for await (const _line of readLinesFast(path)) lines += 1;
    return { ms: performance.now() - start, games: 0, moves: 0, lines };
}

async function streamProfile(
    path: string,
    sampleLimit: number,
): Promise<{
    processMs: number;
    wasmMs: number;
    games: number;
    moves: number;
    lines: number;
    sample: Game[];
}> {
    const board = new ChessBoard();
    let game: Game = { moves: [] };
    let games = 0;
    let moves = 0;
    let lines = 0;
    const sample: Game[] = [];
    let wasmMs = 0;

    const processStart = performance.now();

    for await (const line of readLinesFast(path)) {
        lines += 1;

        if (line !== '' && !line.startsWith('[')) {
            const cleanedLine = line.replaceAll(COMMENT_REGEX, '');
            const matchedMoves = cleanedLine.match(MOVE_REGEX) ?? [];
            game.moves.push(...matchedMoves);

            if (RESULT_REGEX.test(cleanedLine)) {
                const t0 = performance.now();
                board.processGameQuiet(game.moves);
                wasmMs += performance.now() - t0;

                moves += game.moves.length;
                games += 1;

                if (sample.length < sampleLimit) {
                    sample.push({ moves: game.moves.slice() });
                }

                board.reset();
                game = { moves: [] };

                if (games % PROGRESS_EVERY_GAMES === 0) {
                    log(`  … ${games.toLocaleString()} games (${moves.toLocaleString()} moves)`);
                }
            }
        }
    }

    return {
        processMs: performance.now() - processStart,
        wasmMs,
        games,
        moves,
        lines,
        sample,
    };
}

function benchWasmQuiet(games: Game[]): PhaseResult {
    const board = new ChessBoard();
    let moves = 0;
    const start = performance.now();

    for (const game of games) {
        board.processGameQuiet(game.moves);
        moves += game.moves.length;
        board.reset();
    }

    return { ms: performance.now() - start, games: games.length, moves };
}

/** One WASM pass: encode all games and retain compact results for decode bench. */
function benchWasmEncode(games: Game[]): PhaseResult & { raw: ProcessedGameData[] } {
    const board = new Board();
    const raw: ProcessedGameData[] = [];
    let moves = 0;
    const start = performance.now();

    for (const game of games) {
        raw.push(board.process_game(game.moves));
        moves += game.moves.length;
        board.reset();
    }

    return { ms: performance.now() - start, games: games.length, moves, raw };
}

function benchDecode(rawGames: ProcessedGameData[]): PhaseResult & { actionCount: number } {
    let moves = 0;
    let actionCount = 0;
    const start = performance.now();

    for (const raw of rawGames) {
        const decoded = decodeProcessedGame(raw);
        moves += raw.sans.length;
        for (const group of decoded) actionCount += group.length;
    }

    return {
        ms: performance.now() - start,
        games: rawGames.length,
        moves,
        actionCount,
    };
}

function printPhase(name: string, result: PhaseResult, totalMs: number) {
    log(`--- ${name} ---`);
    log(`Time:     ${result.ms.toFixed(0)} ms (${pct(result.ms, totalMs)}% of end-to-end)`);
    if (result.lines) log(`Lines:    ${result.lines.toLocaleString()}`);
    log(`Games:    ${result.games.toLocaleString()}`);
    log(`Moves:    ${result.moves.toLocaleString()}`);
    log(`Per move: ${msPerMove(result.ms, result.moves)} ns/move`);
    log('');
}

const { path, sampleSize, fullSample } = parseArgs(process.argv);
const bytes = statSync(path).size;
const mb = bytes / (1024 * 1024);

log(`File:   ${path}`);
log(`Size:   ${mb.toFixed(1)} MB (${bytes.toLocaleString()} bytes)`);
log(
    `Sample: ${fullSample ? 'all games (tracker sub-phases)' : `${sampleSize.toLocaleString()} games (tracker sub-phases)`}`,
);
log('');

log('=== Phase 1: read-only (line iterator) ===\n');
const read = await benchReadOnly(path);
log(`Time:  ${read.ms.toFixed(0)} ms, Lines: ${read.lines!.toLocaleString()}\n`);

log('=== Phase 2: streaming profile (tokenize + WASM, single pass) ===\n');
const streamStart = performance.now();
const stream = await streamProfile(path, sampleSize);
const streamWallMs = performance.now() - streamStart;

const tokenizeMs = Math.max(0, stream.processMs - stream.wasmMs);
const streamMs = read.ms + tokenizeMs + stream.wasmMs;

log('');
log(`Total (read + tokenize + wasm): ${streamMs.toFixed(0)} ms`);
log(`Throughput:                     ${Math.round(stream.moves / (streamMs / 1000)).toLocaleString()} moves/s`);
log(`  Read:     ${read.ms.toFixed(0)} ms (${pct(read.ms, streamMs)}%)  [separate pass]`);
log(`  Tokenize: ${tokenizeMs.toFixed(0)} ms (${pct(tokenizeMs, streamMs)}%)  [process − wasm]`);
log(`  WASM:     ${stream.wasmMs.toFixed(0)} ms (${pct(stream.wasmMs, streamMs)}%)  [timed at game end]`);
log(`Lines:      ${stream.lines.toLocaleString()}`);
log(`Games:      ${stream.games.toLocaleString()}, Moves: ${stream.moves.toLocaleString()}`);
log(`Pass 2 wall: ${streamWallMs.toFixed(0)} ms (incl. progress logging)`);
log('');

if (stream.sample.length === 0) {
    log('No games collected for sample benchmarks.');
    process.exit(0);
}

const sampleMoves = stream.sample.reduce((n, g) => n + g.moves.length, 0);
const scale = stream.moves / sampleMoves;

log(`=== Tracker-path sub-phases (${stream.sample.length.toLocaleString()} game sample) ===\n`);

const wasmQuietSample = benchWasmQuiet(stream.sample);
const wasmEncodeSample = benchWasmEncode(stream.sample);
const decodeSample = benchDecode(wasmEncodeSample.raw);

printPhase('WASM quiet (sample, isolated re-run)', wasmQuietSample, streamMs);
printPhase('WASM encode (sample, process_game)', wasmEncodeSample, streamMs);
printPhase('JS decode (sample, on encoded data)', decodeSample, streamMs);
log(`         └─ actions decoded: ${decodeSample.actionCount.toLocaleString()}`);

const encodePlusDecode = wasmEncodeSample.ms + decodeSample.ms;
log(`Sample encode + decode: ${encodePlusDecode.toFixed(0)} ms vs quiet ${wasmQuietSample.ms.toFixed(0)} ms (${(encodePlusDecode / wasmQuietSample.ms).toFixed(2)}×)`);
log('');

if (!fullSample && stream.games > stream.sample.length) {
    log('=== Extrapolated full-file tracker path (from sample ratios) ===\n');
    const estEncode = wasmEncodeSample.ms * scale;
    const estDecode = decodeSample.ms * scale;
    const estTracker = estEncode + estDecode;
    log(`Est. WASM encode:  ${estEncode.toFixed(0)} ms (${pct(estEncode, streamMs)}%)`);
    log(`Est. JS decode:    ${estDecode.toFixed(0)} ms (${pct(estDecode, streamMs)}%)`);
    log(`Est. total tracker path: ${estTracker.toFixed(0)} ms (${pct(estTracker, streamMs)}%)`);
    log(`Est. throughput w/ trackers: ${Math.round(stream.moves / (estTracker / 1000)).toLocaleString()} moves/s (parse+decode only, excl. read/tokenize)`);
    log('');
}

log('=== Summary (full file, quiet path) ===\n');
const ranked = [
    ['WASM parse', stream.wasmMs],
    ['Tokenization', tokenizeMs],
    ['PGN read', read.ms],
].sort((a, b) => b[1] - a[1]);

for (const [name, ms] of ranked) {
    log(`  ${name.padEnd(16)} ${ms.toFixed(0).padStart(6)} ms (${pct(ms, streamMs)}%)`);
}

log('');
log('Notes:');
log('- Read is a separate pass; tokenize = processing pass minus WASM.');
log('- Compare with test_release.js (~4 s) which uses multithreaded workers by default.');
log('- Tracker sub-phases use a small sample by default; pass --full-sample to run on all games.');
log('- Pass --sample N to change sample size (default 5000).');
