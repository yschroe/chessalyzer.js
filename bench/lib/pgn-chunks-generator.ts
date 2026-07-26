import {
    DEFAULT_PGN_CHUNK_BYTES,
    encodePgnChunkText,
    readLinesFast,
    type PgnChunk,
    type PgnChunkConfig,
} from '#pgn/line-reader';
import { isGameResultLine, stripComments } from '#pgn/pgn-line-parser';

function findLastCompleteGameLineIndex(lines: string[]): number {
    for (let i = lines.length - 1; i >= 0; i -= 1) {
        const line = lines[i]!;
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

/** Async generator variant of readPgnChunks (kept for iterator performance comparison). */
export async function* readPgnChunksGenerator(
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
