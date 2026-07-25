/**
 * Benchmark: PGN file read throughput (no parsing / analysis).
 * Establishes the I/O floor vs full Chessalyzer runs (see test_release.js).
 *
 * Usage: node manual-tests/bench_read.js [path/to/file.pgn]
 */

import { createReadStream, statSync } from 'node:fs';

const DEFAULT_PGN = './manual-tests/lichess_db_standard_rated_2013-12.pgn';
const path = process.argv[2] ?? DEFAULT_PGN;

const bytes = statSync(path).size;
const mb = bytes / (1024 * 1024);

function formatMbPerSec(elapsedMs) {
    return ((mb / elapsedMs) * 1000).toFixed(1);
}

/** Same chunking strategy as src/js/core/line-reader.ts (production reader). */
async function* readLinesFast(file) {
    const rs = createReadStream(file, { encoding: 'utf-8' });
    let buffer = '';

    for await (const chunk of rs) {
        buffer += chunk.replace(/\r/g, '');
        let newlineIdx = buffer.indexOf('\n');
        while (newlineIdx !== -1) {
            yield buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);
            newlineIdx = buffer.indexOf('\n');
        }
    }

    if (buffer.length > 0) yield buffer;
}

async function benchRawStream() {
    let totalBytes = 0;
    const start = performance.now();

    await new Promise((resolve, reject) => {
        const stream = createReadStream(path);
        stream.on('data', (chunk) => {
            totalBytes += chunk.length;
        });
        stream.on('end', resolve);
        stream.on('error', reject);
    });

    return { totalBytes, elapsedMs: performance.now() - start };
}

async function benchLineReader() {
    let lineCount = 0;
    const start = performance.now();

    for await (const _line of readLinesFast(path)) {
        lineCount += 1;
    }

    return { lineCount, elapsedMs: performance.now() - start };
}

console.log(`File: ${path}`);
console.log(`Size: ${mb.toFixed(1)} MB (${bytes.toLocaleString()} bytes)\n`);

const raw = await benchRawStream();
console.log('--- Raw stream (bytes only, no UTF-8 decode) ---');
console.log(`Time:       ${raw.elapsedMs.toFixed(0)} ms`);
console.log(`Throughput: ${formatMbPerSec(raw.elapsedMs)} MB/s`);

const lines = await benchLineReader();
console.log('\n--- Line reader (UTF-8 decode + split, no parsing) ---');
console.log(`Lines:      ${lines.lineCount.toLocaleString()}`);
console.log(`Time:       ${lines.elapsedMs.toFixed(0)} ms`);
console.log(`Throughput: ${formatMbPerSec(lines.elapsedMs)} MB/s`);
console.log(`Lines/s:    ${Math.round((lines.lineCount / lines.elapsedMs) * 1000).toLocaleString()}`);

const readMs = lines.elapsedMs;
const fullPipelineMs = 4200; // ~test_release.js on same file
const readShare = ((readMs / fullPipelineMs) * 100).toFixed(1);

console.log('\n--- vs full pipeline (test_release.js, ~4.2 s / ~9.2M moves/s) ---');
console.log(`Read-only is ~${(fullPipelineMs / readMs).toFixed(1)}× faster than end-to-end`);
console.log(`I/O accounts for ~${readShare}% of total time (rest is parsing + WASM + trackers)`);
