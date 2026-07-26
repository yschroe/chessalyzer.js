import { describe, it, expect } from 'bun:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { readLinesFast } from '#pgn/line-reader';

const TMP_DIR = join(new URL('../../../test/.tmp', import.meta.url).pathname);

async function writeTmpPgn(name: string, content: string): Promise<string> {
    await mkdir(TMP_DIR, { recursive: true });
    const path = join(TMP_DIR, name);
    await writeFile(path, content);
    return path;
}

async function collectLines(path: string): Promise<string[]> {
    const lines: string[] = [];
    for await (const line of readLinesFast(path)) {
        lines.push(line);
    }
    return lines;
}

describe('readLinesFast', () => {
    it('reassembles a line split across read chunks', async () => {
        const longLine = 'x'.repeat(70 * 1024);
        const path = await writeTmpPgn('long-line.pgn', longLine);

        const lines = await collectLines(path);

        expect(lines).toEqual([longLine]);
    });

    it('preserves empty lines and trailing newline', async () => {
        const path = await writeTmpPgn('empty-lines.pgn', 'a\n\nb\n');

        const lines = await collectLines(path);

        expect(lines).toEqual(['a', '', 'b', '']);
    });
});
