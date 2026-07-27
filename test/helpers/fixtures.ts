/**
 * Helpers for resolving committed test fixtures and optional corpus files.
 *
 * Fixtures (test/fixtures/) are small PGNs tracked in git.
 * Corpus files (test/corpus/) are large PGNs listed in corpus/manifest.json and gitignored.
 */
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import corpusManifest from '../corpus/manifest.json';
import manifest from '../fixtures/manifest.json';

const TEST_DIR = new URL('..', import.meta.url).pathname;
const FIXTURES_DIR = join(TEST_DIR, 'fixtures');
const CORPUS_DIR = join(TEST_DIR, 'corpus');
const TMP_DIR = join(TEST_DIR, '.tmp');

export type FixtureId = keyof typeof manifest.fixtures;

interface TileTrackerGolden {
    movesTotal: number;
    e4TileOccAll: number;
}

export interface FixtureEntry {
    file: string;
    description: string;
    expected: { games: number; moves: number; skippedGames?: number };
    analyzeOptions?: { onError?: 'abort' | 'skip-game' };
    golden?: {
        tileTracker?: TileTrackerGolden;
    };
}

/** Absolute path to a committed fixture PGN. */
export function fixturePath(id: FixtureId): string {
    const entry = manifest.fixtures[id];
    if (!entry) throw new Error(`Unknown fixture id: ${id}`);
    return join(FIXTURES_DIR, entry.file);
}

/** Expected game/move counts from test/fixtures/manifest.json. */
export function fixtureExpected(id: FixtureId) {
    return manifest.fixtures[id].expected;
}

/** Full manifest entry for a fixture (includes optional golden values). */
export function getFixtureEntry(id: FixtureId): FixtureEntry {
    const entry = manifest.fixtures[id];
    if (!entry) throw new Error(`Unknown fixture id: ${id}`);
    return entry as FixtureEntry;
}

/**
 * Resolves a corpus PGN path, checking test/corpus/ first then manifest fallbacks.
 * Returns null when the file is not available locally (corpus tests should skip).
 */
export async function corpusPath(id: string = 'asorted'): Promise<string | null> {
    const entry = corpusManifest.files.find((f) => f.id === id);
    if (!entry) return null;
    const path = join(CORPUS_DIR, entry.file);
    try {
        await access(path);
        return path;
    } catch {
        /* File does not exist */
        return null;
    }
}

/** Manifest entry for a corpus file (expected counts, golden tracker values). */
export function getCorpusEntry(id: string = 'asorted') {
    const entry = corpusManifest.files.find((f) => f.id === id);
    if (!entry) throw new Error(`Unknown corpus id: ${id}`);
    return entry;
}

/**
 * Repeat a fixture's PGN text N times into a temp file (for volume tests).
 * Temp files live in test/.tmp/ and are gitignored.
 */
export async function repeatPgn(id: FixtureId, times: number): Promise<string> {
    const source = fixturePath(id);
    const text = await Bun.file(source).text();
    await mkdir(TMP_DIR, { recursive: true });
    const out = join(TMP_DIR, `${id}x${times}.pgn`);
    await writeFile(out, text.repeat(times));
    return out;
}

export async function cleanupTmpPgns(): Promise<void> {
    try {
        const glob = new Bun.Glob('*.pgn');
        for (const file of glob.scanSync(TMP_DIR)) {
            await unlink(join(TMP_DIR, file));
        }
    } catch {
        // tmp dir may not exist
    }
}

export const allFixtureIds = Object.keys(manifest.fixtures) as FixtureId[];
