import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { defineConfig } from 'waku/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    vite: {
        resolve: {
            tsconfigPaths: true,
            dedupe: ['waku', 'react', 'react-dom'],
            // Rewrite @base-ui's bare CJS imports to local ESM shims (exact match only).
            alias: [
                {
                    find: /^use-sync-external-store\/shim\/with-selector$/,
                    replacement: path.join(
                        root,
                        'src/shims/use-sync-external-store-with-selector.ts',
                    ),
                },
            ],
        },
        plugins: [tailwindcss(), fumadocsMdx()],
    },
});
