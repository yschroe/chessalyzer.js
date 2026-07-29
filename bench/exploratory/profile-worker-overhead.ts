/**
 * Profile worker postMessage overhead (string clone vs transfer).
 *
 * Requires a built worker bundle: npm run build
 *
 * Run: bun bench/exploratory/profile-worker-overhead.ts
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { readLines } from '#io/line-reader';

import { findLargestPgn } from '../lib/pgn-fixture';
import { formatSeconds, timeAsync } from '../lib/timing';

const pgn = findLargestPgn();
const MOVE_REGEX = /[RNBQKOa-h][^\s?!#+]+/g;
const RESULT_REGEX = /-(1\/2|0|1)$/;
const BATCH = 200;
const N_BATCHES = 20;

const batches: { moves: string[] }[] = [];
let game: { moves: string[] } = { moves: [] };
await readLines(pgn.path, (line) => {
    if (!line || !line.length || line.charCodeAt(0) === 91) return;
    const m = line.match(MOVE_REGEX);
    if (m) for (let i = 0; i < m.length; i += 1) game.moves.push(m[i]!);
    if (RESULT_REGEX.test(line)) {
        batches.push(game);
        game = { moves: [] };
        if (batches.length >= BATCH * N_BATCHES) return false;
    }
});

const batchGroups: { moves: string[] }[][] = [];
for (let i = 0; i < batches.length; i += BATCH) {
    batchGroups.push(batches.slice(i, i + BATCH));
}

const movesPerBatch = batchGroups[0]!.reduce((a, g) => a + g.moves.length, 0);
console.log(`${batchGroups.length} batches × ${BATCH} games (~${movesPerBatch} moves/batch)\n`);

const workerPath = join(dirname(fileURLToPath(import.meta.url)), '../../lib/chess-worker.js');

function gamesToChunkBytes(games: { moves: string[] }[]) {
    return new TextEncoder().encode(games.map((g) => `${g.moves.join(' ')} 1-0`).join('\n'));
}

const chunkGroups = batchGroups.map(gamesToChunkBytes);

async function bench(nWorkers: number, label: string, transfer = false) {
    const workers = Array.from({ length: nWorkers }, () => new Worker(workerPath));
    let wi = 0;
    const { ms } = await timeAsync(() =>
        Promise.all(
            batchGroups.map(
                (games) =>
                    new Promise<void>((resolve, reject) => {
                        const w = workers[wi++ % nWorkers]!;
                        const onMsg = () => {
                            w.off('message', onMsg);
                            resolve();
                        };
                        w.on('message', onMsg);
                        w.on('error', reject);
                        const msg = {
                            pgnChunkBytes: gamesToChunkBytes(games),
                            configs: [{ idxConfig: 0, parseHeaders: false }],
                        };
                        if (transfer) {
                            w.postMessage(msg, [msg.pgnChunkBytes.buffer]);
                        } else {
                            w.postMessage(msg);
                        }
                    }),
            ),
        ),
    );
    for (const w of workers) await w.terminate();
    const totalMoves = batchGroups.reduce(
        (a, b) => a + b.reduce((x, g) => x + g.moves.length, 0),
        0,
    );
    console.log(
        `${label.padEnd(32)} ${formatSeconds(ms).padStart(9)}s  ${Math.round(totalMoves / (ms / 1000)).toLocaleString()} moves/s`,
    );
}

{
    const { ms } = await timeAsync(async () => {
        for (const chunk of chunkGroups) structuredClone(chunk);
    });
    console.log(`${'structuredClone (chunk only)'.padEnd(32)} ${formatSeconds(ms).padStart(9)}s`);
}

await bench(8, 'worker RT (string clone)');
await bench(8, 'worker RT (transfer)', true);
