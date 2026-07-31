import tailwindcss from '@tailwindcss/vite';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { defineConfig } from 'waku/config';

const basePath = process.env.DOCS_BASE_PATH
    ? `${process.env.DOCS_BASE_PATH.replace(/\/$/, '')}/`
    : undefined;

export default defineConfig({
    basePath,
    vite: {
        resolve: {
            tsconfigPaths: true,
            dedupe: ['waku', 'react', 'react-dom'],
            // Rewrite @base-ui's bare CJS imports to local ESM shims (exact match only).
            alias: [
                {
                    find: /^use-sync-external-store\/shim\/with-selector$/,
                    replacement: new URL(
                        './src/shims/use-sync-external-store-with-selector.ts',
                        import.meta.url,
                    ).pathname,
                },
            ],
        },
        plugins: [tailwindcss(), fumadocsMdx()],
    },
});
