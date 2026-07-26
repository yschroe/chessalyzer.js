import { createReadStream, createWriteStream, readdirSync, statSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const PGN_DIR = fileURLToPath(new URL('../../pgn', import.meta.url));
const CACHE_DIR = fileURLToPath(new URL('../.cache', import.meta.url));

export interface PerfPgnFixture {
    /** Absolute path to the PGN file used for benchmarking. */
    path: string;
    /** Basename of the source file in manual-tests/. */
    source: string;
    /** How many times the source file was concatenated. */
    repeats: number;
    bytes: number;
}

interface PerfPgnMeta {
    sourcePath: string;
    sourceMtimeMs: number;
    repeats: number;
}

function tryStat(path: string) {
    try {
        return statSync(path);
    } catch {
        return null;
    }
}

/** Pick the largest `.pgn` file under pgn/. */
export function findLargestPgn(): { path: string; name: string; bytes: number } {
    const names = readdirSync(PGN_DIR).filter((name) => name.endsWith('.pgn'));
    if (names.length === 0) {
        throw new Error(`No PGN files found in ${PGN_DIR}. Add a Lichess export under pgn/.`);
    }

    let largest = names[0]!;
    let largestBytes = 0;

    for (const name of names) {
        const bytes = statSync(join(PGN_DIR, name)).size;
        if (bytes > largestBytes) {
            largest = name;
            largestBytes = bytes;
        }
    }

    return {
        path: join(PGN_DIR, largest),
        name: largest,
        bytes: largestBytes,
    };
}

async function readMeta(metaPath: string): Promise<PerfPgnMeta | null> {
    try {
        return JSON.parse(await readFile(metaPath, 'utf8')) as PerfPgnMeta;
    } catch {
        return null;
    }
}

async function concatPgn(sourcePath: string, destPath: string, repeats: number): Promise<void> {
    const out = createWriteStream(destPath);

    for (let i = 0; i < repeats; i += 1) {
        if (i > 0) out.write('\n');
        await pipeline(createReadStream(sourcePath), out, { end: false });
    }

    out.end();
    await new Promise<void>((resolve, reject) => {
        out.on('finish', () => resolve());
        out.on('error', reject);
    });
}

/**
 * Resolve a PGN path suitable for end-to-end performance benchmarking.
 *
 * Uses the largest file in pgn/ and, by default, concatenates it
 * several times into bench/.cache/ so startup overhead is a smaller share of
 * total runtime.
 */
export async function resolvePerfPgn(
    repeats = Number(process.env.BENCH_PGN_REPEATS ?? 2),
): Promise<PerfPgnFixture> {
    const source = findLargestPgn();
    const sourceStat = statSync(source.path);

    if (repeats <= 1) {
        return {
            path: source.path,
            source: source.name,
            repeats: 1,
            bytes: source.bytes,
        };
    }

    await mkdir(CACHE_DIR, { recursive: true });

    const cacheName = `perf-${basename(source.name, '.pgn')}x${repeats}.pgn`;
    const cachePath = join(CACHE_DIR, cacheName);
    const metaPath = `${cachePath}.meta.json`;
    const meta: PerfPgnMeta = {
        sourcePath: source.path,
        sourceMtimeMs: sourceStat.mtimeMs,
        repeats,
    };

    const cachedMeta = await readMeta(metaPath);
    const cacheStat = tryStat(cachePath);
    if (
        cacheStat &&
        cachedMeta &&
        cachedMeta.sourcePath === meta.sourcePath &&
        cachedMeta.sourceMtimeMs === meta.sourceMtimeMs &&
        cachedMeta.repeats === meta.repeats
    ) {
        return {
            path: cachePath,
            source: source.name,
            repeats,
            bytes: cacheStat.size,
        };
    }

    process.stderr.write(
        `Building perf PGN cache (${repeats}x ${source.name}, ${formatBytes(source.bytes)} each)...\n`,
    );

    await concatPgn(source.path, cachePath, repeats);
    await writeFile(metaPath, JSON.stringify(meta));

    return {
        path: cachePath,
        source: source.name,
        repeats,
        bytes: statSync(cachePath).size,
    };
}

function formatBytes(bytes: number): string {
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GiB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
    return `${(bytes / 1024).toFixed(0)} KiB`;
}
