export default [
	{
		input: 'src/index.js',
		output: {
			file: 'lib/chessalyzer.js',
			format: 'esm'
		}
	},
	{
		input: 'src/core/Processor.worker.js',
		output: {
			file: 'lib/Processor.worker.js',
			format: 'esm'
		}
	}
];
