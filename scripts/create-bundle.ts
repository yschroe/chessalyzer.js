import dts from 'bun-plugin-dts';

// Remove lib folder
await Bun.$`rm -rf lib`;

// Create a bundle
const result = await Bun.build({
	entrypoints: ['./src/index.ts', './src/core/chess-worker.ts'],
	outdir: './lib/',
	target: 'node',
	splitting: true,
	naming: '[name].[ext]',
	plugins: [dts()],
	packages: 'external'
});

if (!result.success) {
	for (const log of result.logs) {
		console.error(log);
	}
}

// Remove lib/core folder containing only an empty d.ts file
await Bun.$`rm -rf lib/core`;
