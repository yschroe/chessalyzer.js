/**
 * Stub worker that posts a structured replay AnalyzeError via `result.error`.
 * Used to assert WorkerPool rebuilds a typed abort error on the main thread.
 */
import assert from 'node:assert';
import { parentPort } from 'node:worker_threads';

assert(parentPort, 'stub-structured-error-worker must run as a worker thread');
const port = parentPort;

port.on('message', () => {
    port.postMessage({
        results: [],
        error: {
            code: 'replay',
            gameIndex: 3,
            moveIndex: 2,
            san: 'Nf9',
            reason: 'IllegalMove',
            message: 'w: No piece for move N to (7,6) found!',
        },
    });
});
