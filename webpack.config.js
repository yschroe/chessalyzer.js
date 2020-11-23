const { env } = require('yargs').argv;
const nodeExternals = require('webpack-node-externals');

const TerserPlugin = require('terser-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const DtsBundleWebpack = require('dts-bundle-webpack');

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
	devtool: false,
	output: {
		path: `${__dirname}/lib`,
		filename: `[name]${mode === 'production' ? '.min' : ''}.js`,
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
	plugins: [
		new ESLintPlugin(),
		new DtsBundleWebpack({
			name: `${libraryName}.js`,
			main: 'dts/index.d.ts',
			baseDir: 'dts',
			out: `../lib/${libraryName}.d.ts`
		})
	],
	target: 'node', // in order to ignore built-in modules like path, fs, etc.,
	externals: [nodeExternals()]
};

module.exports = config;
