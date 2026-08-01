import tailwindcss from '@tailwindcss/vite';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { createLogger } from 'vite';
import { defineConfig } from 'waku/config';

// Sourcemaps of zbsearch point to non-existent src folder. Suppress the warning.
const logger = createLogger();
// oxlint-disable-next-line typescript/unbound-method
const loggerWarnOnce = logger.warnOnce;
logger.warnOnce = (msg, options) => {
    if (typeof msg === 'string' && msg.includes('points to missing source files')) return;
    loggerWarnOnce(msg, options);
};

// Set the base path for the documentation.
const basePath = process.env.DOCS_BASE_PATH
    ? `${process.env.DOCS_BASE_PATH.replace(/\/$/, '')}/`
    : '/';

export default defineConfig({
    basePath,
    vite: {
        customLogger: logger,
        resolve: {
            tsconfigPaths: true,
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
        optimizeDeps: {
            include: ['use-sync-external-store/shim/with-selector.js'],
        },
        plugins: [tailwindcss(), fumadocsMdx()],
    },
});
