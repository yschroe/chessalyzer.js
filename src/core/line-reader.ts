import { createReadStream } from 'node:fs';

export function readLinesFast(file: string): AsyncIterable<string> {
	const rs = createReadStream(file, { encoding: 'utf-8' });
	const iterator = rs[Symbol.asyncIterator]();

	let cache: string[] = [];
	let lineBreak = false;

	return {
		[Symbol.asyncIterator]: () => ({
			next: async () => {
				if (cache.length < 2) {
					const { value, done } = await iterator.next();
					if (!done) {
						const lines = value.replace(/\r/g, '').split('\n');
						if (cache.length && !lineBreak) {
							cache[0] += lines.shift();
							cache.push.apply(cache, lines);
						} else {
							cache = lines;
						}
						lineBreak = value[value.length - 1] === '\n';
					}
				}
				if (cache.length) {
					return { value: cache.shift(), done: false };
				}
				return { value: undefined, done: true };
			}
		})
	};
}
