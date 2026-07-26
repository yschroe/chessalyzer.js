/**
 * Atomic micro-benchmark dispatcher.
 *
 * Usage:
 *   npm run bench              # list benches (Node via tsx)
 *   npm run bench -- array     # run array bench on Node
 *   npm run bench:bun -- array # run array bench on Bun
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
    console.log('\nRun: npm run bench -- <name>  (Node)  |  npm run bench:bun -- <name>  (Bun)');
    process.exit(0);
}

const load = benches[target];
if (!load) {
    console.error(`Unknown benchmark: ${target}`);
    console.error(`Available: ${Object.keys(benches).join(', ')}`);
    process.exit(1);
}

const mod = await load();
await mod.default();
process.exit(0);
