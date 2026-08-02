import { defineConfig } from 'bumpp';

export default defineConfig({
    files: ['package.json'],
    commit: 'chore: release {version}',
    tag: 'v{version}',
    push: false,
    all: true, // Commit all pending changes, not just the files listed in `files`.
});
