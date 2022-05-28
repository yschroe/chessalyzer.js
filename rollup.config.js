import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
// defines modules as external dependencies (= will not be bundled into the lib)
const external = [
	'chalk',
	'node:fs',
	'node:perf_hooks',
	'node:readline',
	'node:events',
	'node:cluster',
	'node:path',
	'node:url'
];

export default [
	{
		input: 'src/index.ts',
		output: {
			file: 'lib/chessalyzer.js',
			format: 'esm'
		},
		external,
		plugins: [typescript({ tsconfig: './tsconfig.json' })]
	},
	{
		input: 'src/core/Processor.worker.ts',
		output: {
			file: 'lib/Processor.worker.js',
			format: 'esm'
		},
		external,
		plugins: [typescript({ tsconfig: './tsconfig.json' })]
	},
	{
		input: 'lib/dts/index.d.ts',
		output: [{ file: 'lib/chessalyzer.d.ts', format: 'esm' }],
		plugins: [dts()]
	}
];
