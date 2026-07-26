/**
 * Dispatch atomic micro-benchmarks under bench/atomic/.
 *
 * Usage:
 *   npm run bench:atomic -- array
 *   npm run bench:atomic:bun -- array
 *   tsx bench/bench-atomic.ts array
 */

export {};

const benches: Record<string, () => Promise<{ default: () => Promise<void> }>> = {
    array: () => import('./atomic/array'),
};

const target = process.argv[2];

if (!target) {
    console.log('Available atomic benchmarks:\n');
    for (const name of Object.keys(benches).sort()) {
        console.log(`  ${name}`);
    }
    console.log('\nRun: npm run bench:atomic -- <name>');
    process.exit(0);
}

const load = benches[target];
if (!load) {
    console.error(`Unknown atomic benchmark: ${target}`);
    console.error(`Available: ${Object.keys(benches).join(', ')}`);
    process.exit(1);
}

const mod = await load();
await mod.default();
process.exit(0);
