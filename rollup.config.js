import dts from 'rollup-plugin-dts';

export default [
	{
		input: 'lib/dts/chessalyzer.d.ts',
		output: [{ file: 'lib/chessalyzer.d.ts', format: 'esm' }],
		plugins: [dts()]
	}
];
