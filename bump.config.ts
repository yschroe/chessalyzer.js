import { defineConfig } from 'bumpp';

export default defineConfig({
    files: ['package.json'],
    commit: 'chore: release {version}',
    tag: 'v{version}',
    push: false,
});
