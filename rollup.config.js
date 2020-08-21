import typescript from 'rollup-plugin-typescript2';
import { terser } from "rollup-plugin-terser";
import pkg from './package.json';

export default [
  {
    input: 'src/index.ts',
    output: {
      file: pkg.main
    },
    plugins: [
      typescript(),
      terser({
        output: {
          comments: false
        }
      })
    ],
    external: Object.keys(pkg.dependencies)
  },
  {
    input: 'src/index.ts',
    output: {
      file: pkg.module
    },
    plugins: [
      typescript()
    ],
    external: Object.keys(pkg.dependencies)
  }
]
