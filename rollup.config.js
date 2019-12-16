'use strict'

import clear from 'rollup-plugin-clear'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import typescript from 'rollup-plugin-typescript2'
import screeps from 'rollup-plugin-screeps'

let cfg
const dest = process.env.DEST
if (!dest) {
  console.log('No destination specified - code will be compiled but not uploaded')
} else if ((cfg = require('./screeps.json')[dest]) == null) {
  throw new Error('Invalid upload destination')
}

const ignoreWarnings = ['commonjs-proxy', 'Circular dependency',
  "The 'this' keyword is equivalent to 'undefined'",
  'Use of eval is strongly discouraged']

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/main.js',
    format: 'cjs',
    sourcemap: false
  },

  plugins: [
    clear({ targets: ['dist'] }),
    resolve(),
    commonjs(),
    typescript({tsconfig: './tsconfig.json'}),
    screeps({config: cfg, dryRun: cfg == null})
  ],
  onwarn: (warning) => {
    // Skip default export warnings from using obfuscated overmind file in main
    for (let ignoreWarning of ignoreWarnings) {
      if (warning.toString().includes(ignoreWarning)) {
        return
      }
    }
    // console.warn everything else
    console.warn(warning.message)
  }
}
