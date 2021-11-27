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
		input: 'src/index.js',
		output: {
			file: 'lib/chessalyzer.js',
			format: 'esm'
		},
		external
	},
	{
		input: 'src/core/Processor.worker.js',
		output: {
			file: 'lib/Processor.worker.js',
			format: 'esm'
		},
		external
	}
];
