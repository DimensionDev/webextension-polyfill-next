import gulp from 'gulp'
import { Transform } from 'stream'
import { transform } from '@swc/core'
const { src, lastRun, dest, parallel, watch } = gulp

export default function () {
    return watch('./extension-src/**/*', { ignoreInitial: false }, parallel(compile, copy))
}

function compile() {
    return src(['./extension-src/**/*.js'], {
        since: lastRun(compile),
    })
        .pipe(new PluginTransform())
        .pipe(dest('./extension/'))
}

function copy() {
    return src(['./extension-src/**/(!*.js)'], {
        since: lastRun(copy),
    }).pipe(dest('./extension/'))
}

class PluginTransform extends Transform {
    constructor() {
        super({ objectMode: true, defaultEncoding: 'utf-8' })
    }
    _transform(file, encoding, callback) {
        const id = file.path.replace(/\\/g, '/').split('extension-src')[1].split('/')[1]
        const registerName = `__HostModuleSourceRegister__`
        const virtualPath =
            'holoflows-extension://' + id + '/' + file.path.replace(/\\/g, '/').split('extension-src/' + id + '/')[1]

        transform(file.contents.utf8Slice(), {
            isModule: true,
            jsc: {
                target: 'es2021',
                experimental: {
                    plugins: [
                        [
                            '@masknet/static-module-record-swc',
                            {
                                template: {
                                    type: 'callback',
                                    callback: registerName,
                                    firstArg: virtualPath,
                                },
                            },
                        ],
                    ],
                },
            },
        }).then(
            (output) => {
                file.contents = Buffer.from(output.code, 'utf-8')
                file.path = file.path
                callback(null, file)
            },
            (err) => callback(err),
        )
    }
}
