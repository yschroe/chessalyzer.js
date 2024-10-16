await Bun.build({
	entrypoints: ['./src/chessalyzer.ts', './src/core/ChessWorker.ts'],
	outdir: './lib/',
	target: 'node',
	splitting: true,
	naming: '[name].[ext]',
	minify: true
});
