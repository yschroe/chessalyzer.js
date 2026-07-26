/**
 * Compare async generator vs manual Symbol.asyncIterator for readPgnChunks.
 *
 * Run: bun bench/bench-pgn-chunks-iterator.ts
 *      tsx bench/bench-pgn-chunks-iterator.ts
 */
import { performance } from 'node:perf_hooks';

import {
    DEFAULT_PGN_CHUNK_BYTES,
    encodePgnChunkText,
    readLinesFast,
    readPgnChunks,
    type PgnChunk,
    type PgnChunkConfig,
} from '#pgn/line-reader';
import { isGameResultLine, stripComments } from '#pgn/pgn-line-parser';

const PGN = new URL('../manual-tests/lichess_db_standard_rated_2013-12.pgn', import.meta.url)
    .pathname;
const RUNS = Number(process.env.BENCH_RUNS ?? 5);

function findLastCompleteGameLineIndex(lines: string[]): number {
    for (let i = lines.length - 1; i >= 0; i -= 1) {
        const line = lines[i];
        if (line === '') continue;
        if (line.startsWith('[')) continue;
        return isGameResultLine(stripComments(line)) ? i : -1;
    }
    return -1;
}

function chunkByteSize(lines: string[]): number {
    let size = 0;
    for (const line of lines) {
        size += line.length + 1;
    }
    return size;
}

/** Async generator variant (pre-refactor implementation). */
async function* readPgnChunksGenerator(
    file: string,
    config: PgnChunkConfig = {},
): AsyncGenerator<PgnChunk> {
    const targetBytes = config.targetBytes ?? DEFAULT_PGN_CHUNK_BYTES;
    const maxLines = config.maxLines ?? 50_000;
    const minLines = config.minLines ?? 0;

    const iter = readLinesFast(file)[Symbol.asyncIterator]();
    const accumulator: string[] = [];
    let byteSize = 0;
    let inputDone = false;

    const readLine = async (): Promise<string | null> => {
        if (inputDone) return null;
        const result = await iter.next();
        if (result.done) {
            inputDone = true;
            return null;
        }
        return result.value ?? null;
    };

    const pushLine = (line: string) => {
        accumulator.push(line);
        byteSize += line.length + 1;
    };

    while (true) {
        let line = await readLine();
        while (line !== null) {
            pushLine(line);
            const hitByteTarget = byteSize >= targetBytes && accumulator.length >= minLines;
            const hitLineCap = accumulator.length >= maxLines;
            if (hitByteTarget || hitLineCap) break;
            line = await readLine();
        }

        if (accumulator.length === 0) return;

        while (findLastCompleteGameLineIndex(accumulator) === -1) {
            const nextLine = await readLine();
            if (nextLine === null) break;
            pushLine(nextLine);
        }

        const lastResultIdx = findLastCompleteGameLineIndex(accumulator);
        if (lastResultIdx === -1) return;

        const completeLines = accumulator.slice(0, lastResultIdx + 1);
        const remainder = accumulator.slice(lastResultIdx + 1);

        const text = completeLines.join('\n');

        yield {
            text,
            bytes: encodePgnChunkText(text),
            lineCount: completeLines.length,
        };

        accumulator.length = 0;
        byteSize = 0;
        if (remainder.length > 0) {
            accumulator.push(...remainder);
            byteSize = chunkByteSize(accumulator);
        }

        if (inputDone && accumulator.length === 0) return;
    }
}

async function drain(source: AsyncIterable<PgnChunk>) {
    let chunks = 0;
    let lines = 0;
    for await (const chunk of source) {
        chunks += 1;
        lines += chunk.lineCount;
    }
    return { chunks, lines };
}

async function bench(
    label: string,
    factory: () => AsyncIterable<PgnChunk>,
): Promise<{ label: string; meanMs: number; minMs: number; chunks: number; lines: number }> {
    const times: number[] = [];
    let stats = { chunks: 0, lines: 0 };

    for (let i = 0; i < RUNS; i += 1) {
        const t0 = performance.now();
        stats = await drain(factory());
        times.push(performance.now() - t0);
    }

    const meanMs = times.reduce((sum, ms) => sum + ms, 0) / times.length;
    const minMs = Math.min(...times);

    return { label, meanMs, minMs, chunks: stats.chunks, lines: stats.lines };
}

const config: PgnChunkConfig = { targetBytes: DEFAULT_PGN_CHUNK_BYTES };
const runtime = process.versions.bun ? `Bun ${process.versions.bun}` : `Node ${process.version}`;

console.log(`readPgnChunks iterator comparison`);
console.log(`Runtime: ${runtime}`);
console.log(`PGN: ${PGN}`);
console.log(`Runs: ${RUNS}\n`);

await drain(readPgnChunks(PGN, config));

const results = [
    await bench('async generator', () => readPgnChunksGenerator(PGN, config)),
    await bench('manual iterator', () => readPgnChunks(PGN, config)),
];

const fastest = results.reduce((best, result) => (result.meanMs < best.meanMs ? result : best));

const nameWidth = Math.max(...results.map((result) => result.label.length));

console.log(
    `${'Method'.padEnd(nameWidth)}  ${'mean (s)'.padStart(9)}  ${'min (s)'.padStart(9)}  ${'relative'.padStart(10)}`,
);
console.log(`${'-'.repeat(nameWidth + 33)}`);

for (const result of results) {
    const relative = result.meanMs / fastest.meanMs;
    const relativeLabel = result === fastest ? '1.00x' : `${relative.toFixed(2)}x slower`;
    console.log(
        `${result.label.padEnd(nameWidth)}  ${(result.meanMs / 1000).toFixed(3).padStart(9)}  ${(result.minMs / 1000).toFixed(3).padStart(9)}  ${relativeLabel.padStart(10)}`,
    );
}

const sample = results[0]!;
console.log(`\nOutput: ${sample.chunks} chunks, ${sample.lines.toLocaleString()} lines`);
console.log(`Fastest: ${fastest.label}`);
