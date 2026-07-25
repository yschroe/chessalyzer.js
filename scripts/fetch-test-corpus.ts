/**
 * Copies large PGN corpus files into test/corpus/ for optional regression tests.
 *
 * Corpus files are gitignored; this script tries each path listed in
 * test/corpus/manifest.json (e.g. an existing local copy or manual-tests/).
 *
 * Run once after clone: bun run test:fetch-corpus
 */
import { copyFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';

import corpusManifest from '../test/corpus/manifest.json';

const ROOT = new URL('..', import.meta.url).pathname;
const CORPUS_DIR = join(ROOT, corpusManifest.dir);

async function exists(path: string) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

// await mkdir(CORPUS_DIR, { recursive: true });

let missing = 0;

for (const entry of corpusManifest.files) {
    const dest = join(CORPUS_DIR, entry.file);
    if (await exists(dest)) {
        console.log(`Already present: ${dest}`);
        continue;
    }

    // Try each known source location until one is found on disk.
    let copied = false;
    for (const source of entry.sources) {
        const src = join(ROOT, source);
        if (await exists(src)) {
            await copyFile(src, dest);
            console.log(`Copied ${source} -> ${dest}`);
            copied = true;
            break;
        }
    }

    if (!copied) {
        missing += 1;
        console.warn(
            `Missing corpus file "${entry.file}". Place it at ${corpusManifest.dir}/${entry.file} or at one of: ${entry.sources.join(', ')}`,
        );
    }
}

if (missing > 0) process.exitCode = 1;
