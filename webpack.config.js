/* global __dirname, require, module */
const { env } = require('yargs').argv; // use --env with webpack 2
const nodeExternals = require('webpack-node-externals');
const stylish = require('eslint/lib/cli-engine/formatters/stylish');
const TerserPlugin = require('terser-webpack-plugin');

const libraryName = 'chessalyzer';

let outputFile;
let mode;

if (env === 'build') {
	mode = 'production';
	outputFile = `${libraryName}.min.js`;
} else {
	mode = 'development';
	outputFile = `${libraryName}.js`;
}

const config = {
	mode,
	// entry: `${__dirname}/src/index.js`,
	entry: {
		chessalyzer: `${__dirname}/src/index.js`,
		worker: `${__dirname}/src/core/Processor.worker.js`
	},
	devtool: 'source-map',
	output: {
		path: `${__dirname}/lib`,
		// filename: outputFile,
		filename: '[name].js',
		library: libraryName,
		libraryTarget: 'umd',
		umdNamedDefine: true
	},
	optimization: {
		minimizer: [new TerserPlugin()]
	},
	module: {
		rules: [
			{
				test: /(\.jsx|\.js)$/,
				loader: 'babel-loader',
				exclude: /(node_modules|bower_components)/
			},
			// {
			// 	test: /\.worker\.js$/,
			// 	use: [{ loader: 'worker-loader' }, { loader: 'babel-loader' }],
			// 	exclude: /node_modules/
			// },
			{
				test: /(\.jsx|\.js)$/,
				exclude: /node_modules/,
				use: [
					{
						loader: 'eslint-loader',
						options: {
							formatter: stylish
						}
					}
				]
			}
		]
	},
	target: 'node', // in order to ignore built-in modules like path, fs, etc.,
	node: {
		__dirname: false
	},
	externals: [nodeExternals()]
};

module.exports = config;
