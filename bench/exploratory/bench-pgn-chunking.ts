/**
 * Main-thread cost of multithreaded chunking, without workers.
 * Run: node --import tsx bench/exploratory/bench-pgn-chunking.ts
 *
 * Compares a raw file read (I/O floor), byte-level `readPgnChunks` with defaults, and
 * the same with `maxLines` set (opt-in line counting). The pre-2026-10-23 line-based
 * chunker (readline → join → TextEncoder) is at commit b9ac194 for A/B comparison.
 * BENCH_RUNS controls samples (default 3).
 */
import { open } from 'node:fs/promises';

import { readPgnChunks, type PgnChunkConfig } from '#io/pgn-chunks';
import { resolvePerfPgn } from '~/bench/lib/pgn-fixture';
import { printTimedResults, runTimed } from '~/bench/lib/timing';

const runs = Number(process.env.BENCH_RUNS ?? 3);
const fixture = await resolvePerfPgn();

async function rawRead(path: string): Promise<number> {
    const handle = await open(path, 'r');
    const buf = Buffer.allocUnsafeSlow(4 * 1024 * 1024);
    let bytes = 0;
    try {
        for (;;) {
            // oxlint-disable-next-line eslint/no-await-in-loop -- sequential reads are the measurement
            const { bytesRead } = await handle.read(buf, 0, buf.length, null);
            if (bytesRead === 0) return bytes;
            bytes += bytesRead;
        }
    } finally {
        await handle.close();
    }
}

async function drain(path: string, config: PgnChunkConfig): Promise<number> {
    let bytes = 0;
    for await (const chunk of readPgnChunks(path, config)) {
        bytes += chunk.bytes.byteLength;
    }
    return bytes;
}

const results = [
    await runTimed('raw read (I/O floor)', () => rawRead(fixture.path), { runs }),
    await runTimed('readPgnChunks (defaults)', () => drain(fixture.path, {}), { runs }),
    await runTimed(
        'readPgnChunks (maxLines: 50_000)',
        () => drain(fixture.path, { maxLines: 50_000 }),
        {
            runs,
        },
    ),
];

console.log(`PGN: ${fixture.path} (${(fixture.bytes / (1024 * 1024)).toFixed(1)} MiB)`);
printTimedResults(results, { stddev: true, cv: true });
