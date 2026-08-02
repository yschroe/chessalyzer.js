/**
 * Minimal worker for WorkerPool unit tests.
 *
 * Intentionally not the production chess-worker: pool mechanics (lazy spawn,
 * missing-file errors, successful message handling) should not depend on a build
 * or on tracker registry behavior (covered in worker-tracker-registry).
 */
import assert from 'node:assert';
import { parentPort } from 'node:worker_threads';

assert(parentPort, 'stub-worker must run as a worker thread');
const port = parentPort;

port.on('message', () => {
    port.postMessage({ results: [{ idxConfig: 0, games: 0, moves: 0 }] });
});
