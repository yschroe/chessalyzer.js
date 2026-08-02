/**
 * Stub worker that always reports a batch error via `result.error`.
 * Used to assert WorkerPool rejects runTask (and does not hang) without depending
 * on chess-worker / tracker registry.
 */
import assert from 'node:assert';
import { parentPort } from 'node:worker_threads';

assert(parentPort, 'stub-error-worker must run as a worker thread');
const port = parentPort;

port.on('message', () => {
    port.postMessage({
        results: [],
        error: 'Unknown tracker "DoesNotExist"',
    });
});
