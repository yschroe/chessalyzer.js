import { createReadStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

const PGN = new URL('../manual-tests/lichess_db_standard_rated_2013-12.pgn', import.meta.url)
    .pathname;
const MOVE_REGEX = /[RNBQKOa-h][^\s?!#+]+/g;
const RESULT_REGEX = /-(1\/2|0|1)$/;
const BATCH = 200;
const N_BATCHES = 20;

function readLinesFast(file) {
    const rs = createReadStream(file, { encoding: 'utf-8' });
    const it = rs[Symbol.asyncIterator]();
    const cache = [];
    let lineBreak = false;
    return {
        [Symbol.asyncIterator]: () => ({
            async next() {
                let line = cache.shift() ?? null;
                if (cache.length === 0) {
                    const { value, done } = await it.next();
                    if (!done) {
                        const lines = value.replace(/\r/g, '').split('\n');
                        if (line !== null && !lineBreak) line += lines.shift();
                        if (line === null) line = lines.shift();
                        cache.push(...lines);
                        lineBreak = value.charCodeAt(value.length - 1) === 10;
                    }
                }
                return line !== null ? { value: line, done: false } : { done: true };
            },
        }),
    };
}

const batches = [];
let game = { moves: [] };
for await (const line of readLinesFast(PGN)) {
    if (!line.length || line.charCodeAt(0) === 91) continue;
    const m = line.match(MOVE_REGEX);
    if (m) for (let i = 0; i < m.length; i += 1) game.moves.push(m[i]);
    if (RESULT_REGEX.test(line)) {
        batches.push(game);
        game = { moves: [] };
        if (batches.length >= BATCH * N_BATCHES) break;
    }
}

const batchGroups = [];
for (let i = 0; i < batches.length; i += BATCH) {
    batchGroups.push(batches.slice(i, i + BATCH));
}

const movesPerBatch = batchGroups[0].reduce((a, g) => a + g.moves.length, 0);
console.log(`${batchGroups.length} batches × ${BATCH} games (~${movesPerBatch} moves/batch)\n`);

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerPath = join(__dirname, '../../lib/chess-worker.js');

function gamesToChunk(games) {
    return games.map((game) => `${game.moves.join(' ')} 1-0`).join('\n');
}

const chunkGroups = batchGroups.map(gamesToChunk);

function gamesToChunkBytes(games) {
    return new TextEncoder().encode(games.map((game) => `${game.moves.join(' ')} 1-0`).join('\n'));
}

async function bench(nWorkers, label, makeMsg, transfer = false) {
    const workers = Array.from({ length: nWorkers }, () => new Worker(workerPath));
    let wi = 0;
    const t0 = performance.now();
    await Promise.all(
        batchGroups.map(
            (games) =>
                new Promise((resolve, reject) => {
                    const w = workers[wi++ % nWorkers];
                    const onMsg = () => {
                        w.off('message', onMsg);
                        resolve(undefined);
                    };
                    w.on('message', onMsg);
                    w.on('error', reject);
                    const msg = makeMsg(games);
                    if (transfer) {
                        w.postMessage(msg, [msg.pgnChunkBytes.buffer]);
                    } else {
                        w.postMessage(msg);
                    }
                }),
        ),
    );
    const ms = performance.now() - t0;
    for (const w of workers) await w.terminate();
    const totalMoves = batchGroups.reduce(
        (a, b) => a + b.reduce((x, g) => x + g.moves.length, 0),
        0,
    );
    console.log(
        `${label.padEnd(32)} ${(ms / 1000).toFixed(3)}s  ${Math.round(totalMoves / (ms / 1000)).toLocaleString()} moves/s`,
    );
}

{
    const t0 = performance.now();
    for (const chunk of chunkGroups) structuredClone(chunk);
    console.log(
        `${'structuredClone (chunk only)'.padEnd(32)} ${((performance.now() - t0) / 1000).toFixed(3)}s`,
    );
}

await bench(8, 'worker RT (string clone)', (games) => ({
    pgnChunkBytes: gamesToChunkBytes(games),
    idxConfig: 0,
    readInHeader: false,
}));

await bench(
    8,
    'worker RT (transfer)',
    (games) => ({
        pgnChunkBytes: gamesToChunkBytes(games),
        idxConfig: 0,
        readInHeader: false,
    }),
    true,
);
