import dts from 'bun-plugin-dts';

// Remove lib folder
await Bun.$`rm -rf lib`;

// Create a bundle
const result = await Bun.build({
	entrypoints: ['./src/chessalyzer.ts', './src/core/ChessWorker.ts'],
	outdir: './lib/',
	target: 'node',
	splitting: true,
	naming: '[name].[ext]',
	minify: true,
	plugins: [dts()]
});

if (!result.success) {
	for (const log of result.logs) {
		console.error(log);
	}
}

// Remove lib/core folder containing only an empty d.ts file
await Bun.$`rm -rf lib/core`;
