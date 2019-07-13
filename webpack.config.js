const { env } = require('yargs').argv; // use --env with webpack 2
const nodeExternals = require('webpack-node-externals');
const stylish = require('eslint/lib/cli-engine/formatters/stylish');
const TerserPlugin = require('terser-webpack-plugin');

const libraryName = 'chessalyzer';

let mode;

if (env === 'build') {
	mode = 'production';
} else {
	mode = 'development';
}

const config = {
	mode,
	entry: {
		chessalyzer: `${__dirname}/src/index.js`,
		worker: `${__dirname}/src/core/Processor.worker.js`
	},
	devtool: 'source-map',
	output: {
		path: `${__dirname}/lib`,
		filename: `[name]${mode === 'production' ? '.min' : ''}.js`,
		// filename: '[name].js',
		library: libraryName,
		libraryTarget: 'umd',
		umdNamedDefine: true
	},
	optimization: {
		minimizer: [
			new TerserPlugin({
				terserOptions: {
					keep_fnames: true
				}
			})
		]
	},
	module: {
		rules: [
			{
				test: /(\.jsx|\.js)$/,
				loader: 'babel-loader',
				exclude: /(node_modules|bower_components)/
			},
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
