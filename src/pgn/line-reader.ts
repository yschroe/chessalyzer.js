import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

/**
 * Sync line handler. Return `false` to stop reading early (closes the stream).
 * Keep work synchronous — awaiting here would reintroduce per-line async overhead.
 */
export type LineHandler = (line: string) => void | false;

/**
 * Read a file line-by-line via readline `'line'` events.
 *
 * Processing stays on the sync event path; the returned promise resolves when
 * the stream closes (EOF, early stop, or error).
 */
export async function readLines(file: string, onLine: LineHandler): Promise<void> {
    const input = createReadStream(file, { encoding: 'utf8' });
    const rl = createInterface({ input, crlfDelay: Infinity });

    let stopped = false;
    let handlerError: unknown;

    await new Promise<void>((resolve, reject) => {
        const fail = (err: Error) => {
            stopped = true;
            reject(err);
        };

        rl.on('line', (line) => {
            if (stopped) return;
            try {
                if (onLine(line) === false) {
                    stopped = true;
                    rl.close();
                }
            } catch (err) {
                stopped = true;
                handlerError = err;
                rl.close();
            }
        });

        rl.once('close', () => {
            resolve();
        });
        rl.once('error', fail);
        input.once('error', fail);
    }).finally(() => {
        rl.close();
        input.destroy();
    });

    if (handlerError !== undefined) throw handlerError;
}
