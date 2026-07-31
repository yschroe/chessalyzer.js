import dts from 'bun-plugin-dts';

// Remove lib folder
await Bun.$`rm -rf lib`;

// Bundle the project
const result = await Bun.build({
    entrypoints: [
        './src/index.ts',
        './src/core/chess-worker.ts',
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

// Remove lib/core folder containing only an empty d.ts file
// await Bun.$`rm -rf lib/core`;

// // Subpath .d.ts files land under lib/export/ — hoist next to lib/*.js entrypoints
// await Bun.$`mv lib/export/pgn.d.ts lib/pgn.d.ts`;
// await Bun.$`mv lib/export/replay.d.ts lib/replay.d.ts`;
// await Bun.$`mv lib/export/trackers.d.ts lib/trackers.d.ts`;
// await Bun.$`rm -rf lib/export`;
