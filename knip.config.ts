import { defineConfig } from 'knip/config';

export default defineConfig(({ production }) => ({
    workspaces: {
        '.': {
            entry: [
                // No suffix: development-only entry points.
                'bench/*.ts',
                'bench/{atomic,exploratory}/*.ts',
                'manual-tests/**/*.ts',
                'test/**/*.type-test.ts',
                // Trailing !: entry points in both default and production mode.
                'src/index.ts!',
                'src/chess-worker.ts!',
                'src/pgn/index.ts!',
                'src/board/index.ts!',
                'src/replay/index.ts!',
                'src/trackers/index.ts!',
            ],
            project: [
                '**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}!',
                // Leading + trailing !: exclude from production mode only.
                '!**/__tests__/**!',
                '!**/__fixtures__/**!',
                '!{bench,scripts,test,manual-tests}/**!',
            ],
        },
        docs: {
            entry: ['src/pages/**/*.{ts,tsx}!', 'waku.config.ts!', 'examples/generate-outputs.ts'],
        },
    },
    // Helpers called within their own production module are live, even when only tests import them.
    ignoreExportsUsedInFile: production ?? false,
}));
