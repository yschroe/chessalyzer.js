#!/usr/bin/env node
/**
 * Build GitHub release notes from CHANGELOG.md for a version, plus commits since the previous tag.
 *
 * Usage: node scripts/release-notes.mjs <version>
 *   version — semver without "v" prefix (e.g. 4.0.0-alpha.1)
 *
 * Writes RELEASE_BODY.md (override path with RELEASE_NOTES_OUTPUT).
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const version = process.argv[2]?.replace(/^v/, '');
if (!version) {
    console.error('Usage: node scripts/release-notes.mjs <version>');
    process.exit(1);
}

const changelog = readFileSync('CHANGELOG.md', 'utf8');
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sectionRe = new RegExp(`## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n## \\[|$)`);
const match = changelog.match(sectionRe);
if (!match) {
    console.error(`No changelog section found for [${version}] in CHANGELOG.md`);
    process.exit(1);
}

let body = match[0].trim();

const tag = `v${version}`;
const prevTag = findPreviousTag(tag);
const commitRange = prevTag ? `${prevTag}..${tag}` : tag;

let commits = '';
try {
    commits = execSync(`git log ${commitRange} --oneline --no-merges`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
} catch {
    if (prevTag) {
        try {
            commits = execSync(`git log ${prevTag}..HEAD --oneline --no-merges`, {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
            }).trim();
        } catch {
            commits = '';
        }
    }
}

if (commits) {
    body += '\n\n### Commits\n\n';
    body += commits
        .split('\n')
        .map((line) => `- ${line}`)
        .join('\n');
}

const outPath = process.env.RELEASE_NOTES_OUTPUT ?? 'RELEASE_BODY.md';
writeFileSync(outPath, `${body}\n`);
console.log(`Wrote release notes to ${outPath}`);

function findPreviousTag(currentTag) {
    let tags = [];
    try {
        tags = execSync('git tag --sort=-v:refname', { encoding: 'utf8' })
            .trim()
            .split('\n')
            .filter(Boolean);
    } catch {
        return null;
    }

    const index = tags.indexOf(currentTag);
    if (index >= 0 && index < tags.length - 1) {
        return tags[index + 1];
    }

    if (tags.length > 0 && tags[0] !== currentTag) {
        return tags[0];
    }

    return null;
}
