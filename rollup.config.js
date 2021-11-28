import typescript from '@rollup/plugin-typescript';
// defines modules as external dependencies (= will not be bundled into the lib)
const external = [
	'fs',
	'perf_hooks',
	'chalk',
	'readline',
	'events',
	'cluster',
	'path',
	'url'
];

export default [
	{
		input: 'src/index.ts',
		output: {
			file: 'lib/chessalyzer.js',
			format: 'esm'
		},
		external,
		plugins: [typescript()]
	},
	{
		input: 'src/core/Processor.worker.ts',
		output: {
			file: 'lib/Processor.worker.js',
			format: 'esm'
		},
		external,
		plugins: [typescript()]
	}
];
