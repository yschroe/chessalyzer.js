#!/usr/bin/env node
/**
 * Publish (or dry-run) to npm with the correct dist-tag for prereleases.
 *
 * Usage:
 *   node scripts/npm-publish.mjs             # publish
 *   node scripts/npm-publish.mjs --dry-run   # validate tarball only
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const dryRun = process.argv.includes('--dry-run');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const { version } = pkg;

const args = ['publish', '--access', 'public'];
if (dryRun) {
    args.push('--dry-run');
}

const prereleaseId = version.includes('-') ? version.split('-')[1]?.split('.')[0] : null;
if (prereleaseId) {
    args.push('--tag', prereleaseId);
}

if (pkg.publishConfig?.provenance && !dryRun) {
    args.push('--provenance');
}

const cmd = `npm ${args.join(' ')}`;
console.log(`> ${cmd}`);
execSync(cmd, { stdio: 'inherit' });
