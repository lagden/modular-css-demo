import svelte from 'rollup-plugin-svelte'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import sugarss from 'sugarss'
import css from '@modular-css/rollup'
import pp from '@modular-css/svelte'

const {preprocess, processor} = pp({
	exportGlobals: true,
	before: [
		require('postcss-easy-import')({
			extensions: ['.sss', '.css']
		}),
		require('postcss-mixins'),
		require('postcss-conditionals'),
		require('postcss-simple-vars'),
		require('postcss-nested')
	],
	postcss: {
		parser: sugarss
	}
})

const {
	NODE_ENV = 'development',
} = process.env

const production = NODE_ENV === 'production'

export default {
	input: ['src/main.js'],
	output: {
		format: 'es',
		dir: 'public/js',
		assetFileNames: 'assets/[name][extname]',
		sourcemap: true
		// format: 'iife',
		// file: 'public/demo.js',
		// name: 'produto',
		// assetFileNames: 'assets/[name][extname]',
		// sourcemap: true
	},
	plugins: [
		svelte({
			dev: !production,
			preprocess
		}),
		css({
			dev: !production,
			processor,
			common: 'public/css/common.css',
			namedExports: true
		}),
		resolve({
			browser: true,
			dedupe: importee => importee === 'svelte' || importee.startsWith('svelte/')
		}),
		commonjs()
	],
	watch: {
		clearScreen: false
	}
}
