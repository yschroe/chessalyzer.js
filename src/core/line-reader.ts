import { createReadStream } from 'node:fs';

export function readLinesFast(file: string): AsyncIterable<string> {
	const rs = createReadStream(file, { encoding: 'utf-8' });
	const iterator: AsyncIterator<string, string> = rs[Symbol.asyncIterator]();

	const cache: string[] = [];
	let lineBreak = false;

	return {
		[Symbol.asyncIterator]: () => ({
			next: async () => {
				// If the cache is less than 2 lines, read in more lines
				if (cache.length < 2) {
					// Read in chunk of size highWaterMark (default: 64 * 1024 bytes)
					const { value, done } = await iterator.next();

					// If the iterator is not done, split the chunk into lines
					if (!done) {
						const lines = value.replace(/\r/g, '').split('\n');
						// If the cache is not empty and the line break flag is not set,
						// it means the last line of the previous chunk was not a full line.
						// Append the first line of the new chunk to complete the line.
						if (cache.length && !lineBreak) {
							cache[0] += lines.shift();
						}
						cache.push(...lines);

						// Check if chunk ended with a line break
						lineBreak = value.at(-1) === '\n';
					}
				}
				// If the cache has data, return the first line
				if (cache.length) {
					return { value: cache.shift(), done: false };
				}
				return { value: undefined, done: true };
			}
		})
	};
}
