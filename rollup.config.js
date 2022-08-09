import replace from '@rollup/plugin-replace'

export default [
    {
        input: './dist/core/index.js',
        output: {
            file: './dist/bundle.js',
            format: 'iife',
        },
        plugins: [
            replace({
                __debug__mode__: 'false',
                'typeof importScripts': `"undefined"`,
                'typeof location': `"object"`,
                preventAssignment: true,
            }),
        ],
    },
    {
        input: './dist/worker/index.js',
        output: {
            file: './dist/bundle-worker.js',
            format: 'iife',
        },
        plugins: [
            replace({
                __debug__mode__: 'false',
                'typeof importScripts': `"function"`,
                'typeof location': `"object"`,
                preventAssignment: true,
            }),
        ],
    },
]
