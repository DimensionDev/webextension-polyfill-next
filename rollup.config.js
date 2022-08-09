import replace from '@rollup/plugin-replace'
import { nodeResolve } from '@rollup/plugin-node-resolve'

export default {
    input: './dist/core/index.js',
    output: {
        file: './dist/bundle.js',
        format: 'iife',
    },
    plugins: [
        replace({
            __debug__mode__: 'false',
            preventAssignment: true,
        }),
        nodeResolve(),
    ],
}
