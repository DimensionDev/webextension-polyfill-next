import type { NormalizedManifest } from '../../../../types/manifest.js'
import { FrameworkRPC } from '../../../rpc/framework.js'
import { getExtensionOrigin } from '../../../utils/url.js'
import { getIDFromBlobURL } from '../URL.js'
import { createEventListener } from './listener.js'
import { createRuntimeSendMessage } from './message.js'
import { createPort } from './port.js'

export function createBrowser(extensionID: string, manifest: NormalizedManifest, proto = Object.prototype) {
    const api = Object.create(proto) as Partial<typeof browser>

    api.downloads = createBrowserDownload() as typeof browser.downloads
    api.runtime = createBrowserRuntime() as typeof browser.runtime

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

    function createBrowserRuntime(): Partial<typeof browser.runtime> {
        return {
            getURL: (path) => getExtensionOrigin(extensionID) + path,
            getManifest: () => JSON.parse(JSON.stringify(manifest.rawManifest)),
            onMessage: createEventListener(extensionID, 'browser.runtime.onMessage'),
            onInstalled: createEventListener(extensionID, 'browser.runtime.onInstall'),
            connect: (...args) => createPort(extensionID, undefined, undefined, ...args as any),
            onConnect: createEventListener(extensionID, 'browser.runtime.onConnect'),
            sendMessage: createRuntimeSendMessage(extensionID),
            get id() {
                return extensionID
            },
            set id(val) {},
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
