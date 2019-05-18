/* global __dirname, require, module */

// const webpack = require('webpack');
// const path = require('path');

const { env } = require('yargs').argv; // use --env with webpack 2
const nodeExternals = require('webpack-node-externals');
// const pkg = require('./package.json');

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
	entry: `${__dirname}/src/index.js`,
	devtool: 'source-map',
	output: {
		path: `${__dirname}/lib`,
		filename: outputFile,
		library: libraryName,
		libraryTarget: 'umd',
		umdNamedDefine: true
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
				loader: 'eslint-loader',
				exclude: /node_modules/
			}
		]
	},
	target: 'node', // in order to ignore built-in modules like path, fs, etc.
	externals: [nodeExternals()]
};

module.exports = config;
