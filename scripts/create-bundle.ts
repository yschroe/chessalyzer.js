import dts from 'bun-plugin-dts';

// Remove lib folder
await Bun.$`rm -rf lib`;

// Create a bundle
const result = await Bun.build({
    entrypoints: [
        './src/index.ts',
        './src/core/chess-worker.ts',
        './src/export/io.ts',
        './src/export/pgn.ts',
        './src/export/replay.ts',
        './src/export/trackers.ts',
    ],
    outdir: './lib/',
    target: 'node',
    splitting: true,
    naming: '[name].[ext]',
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

// Remove lib/core folder containing only an empty d.ts file
await Bun.$`rm -rf lib/core`;

// Subpath .d.ts files land under lib/export/ — hoist next to lib/*.js entrypoints
await Bun.$`mv lib/export/io.d.ts lib/io.d.ts`;
await Bun.$`mv lib/export/pgn.d.ts lib/pgn.d.ts`;
await Bun.$`mv lib/export/replay.d.ts lib/replay.d.ts`;
await Bun.$`mv lib/export/trackers.d.ts lib/trackers.d.ts`;
await Bun.$`rm -rf lib/export`;
