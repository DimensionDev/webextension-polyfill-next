import type { NormalizedManifest } from '../../../../types/manifest.js'
import { FrameworkRPC } from '../../../rpc/framework.js'
import { getIDFromBlobURL } from '../URL.js'

export function createBrowser(extensionID: string, manifest: NormalizedManifest, proto = Object.prototype) {
    const api = Object.create(proto) as Partial<typeof browser>

    api.downloads = createBrowserDownload() as typeof browser.downloads

    return api

    function createBrowserDownload(): Partial<typeof browser.downloads> {
        return {
            async download(options) {
                let { url, filename } = PartialImplemented(options, ['filename', 'url'])
                if (!url) throw new TypeError(`download: url is required`)
                if (getIDFromBlobURL(url)) {
                    url = `holoflows-blob://${extensionID}/${getIDFromBlobURL(url)!}`
                }
                const nextOption = { url, filename: filename ?? '' }
                await FrameworkRPC['browser.downloads.download'](extensionID, nextOption)
                return 0
            },
        }
    }
}

function PartialImplemented<T>(options: T, keys: (keyof T)[], stack = new Error().stack) {
    const partialOptions: Partial<T> = {}
    for (const key in options) {
        if (Object.prototype.hasOwnProperty.call(options, key)) {
            if (!keys.includes(key) && (options[key] ?? false)) {
                console.warn(`Unimplemented options`, options, `at`, stack)
            } else {
                partialOptions[key] = options[key]
            }
        }
    }
    return partialOptions
}
