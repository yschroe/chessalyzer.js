import dts from 'bun-plugin-dts';

// Remove lib folder
await Bun.$`rm -rf lib`;

// Bundle the project
const result = await Bun.build({
    entrypoints: [
        './src/index.ts',
        './src/chess-worker.ts',
        './src/pgn/index.ts',
        './src/replay/index.ts',
        './src/trackers/index.ts',
    ],
    outdir: './lib/',
    target: 'node',
    splitting: true,
    plugins: [
        dts({
            output: {
                // Do not export internal-only types (MutableBoardCoord, etc.)
                exportReferencedTypes: false,
            },
        }),
    ],
});

if (!result.success) {
    for (const log of result.logs) console.error(log);
}
