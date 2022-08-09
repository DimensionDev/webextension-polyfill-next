import type { NormalizedManifest } from '../../../../types/manifest.js'
import { FrameworkRPC } from '../../../rpc/framework-rpc.js'
import { internalRPC } from '../../../rpc/internal-rpc.js'
import { getExtensionOrigin } from '../../../utils/url.js'
import { getIDFromBlobURL } from '../URL.js'
import { getInternalStorage } from './internal-storage.js'
import { createEventListener } from './listener.js'
import { createRuntimeSendMessage, sendMessageWithResponse } from './message.js'
import { createPort } from './port.js'

export function createBrowser(extensionID: string, manifest: NormalizedManifest, proto = Object.prototype) {
    const api = Object.create(proto) as Partial<typeof browser>

    api.downloads = createBrowserDownload() as typeof browser.downloads
    api.runtime = createBrowserRuntime() as typeof browser.runtime
    api.tabs = createBrowserTabs() as typeof browser.tabs
    api.storage = createBrowserStorage() as typeof browser.storage
    api.webNavigation = createWebNavigation() as typeof browser.webNavigation
    api.permissions = createBrowserPermission() as typeof browser.permissions

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
            connect: (...args) => createPort(extensionID, undefined, undefined, ...(args as any)),
            onConnect: createEventListener(extensionID, 'browser.runtime.onConnect'),
            sendMessage: createRuntimeSendMessage(extensionID),
            get id() {
                return extensionID
            },
            set id(val) {},
        }
    }

    function createBrowserTabs(): Partial<typeof browser.tabs> {
        return {
            async executeScript(tabID, details) {
                PartialImplemented(details, ['code', 'file', 'runAt'])
                if (details.code) throw new Error('Cannot use "code" options due to Content Security Policy.')
                await internalRPC.executeContentScript(tabID!, extensionID, manifest, details)
                return []
            },
            create(...args) {
                return FrameworkRPC['browser.tabs.create'](extensionID, ...args)
            },
            async remove(tabID) {
                let t: number[]
                if (!Array.isArray(tabID)) t = [tabID]
                else t = tabID
                await Promise.all(t.map((x) => FrameworkRPC['browser.tabs.remove'](extensionID, x)))
            },
            query(...args) {
                return FrameworkRPC['browser.tabs.query'](extensionID, ...args)
            },
            update(...args) {
                return FrameworkRPC['browser.tabs.update'](extensionID, ...args)
            },
            async sendMessage<T = any, U = object>(
                tabId: number,
                message: T,
                options?: { frameId?: number | undefined } | undefined,
            ): Promise<void | U> {
                PartialImplemented(options, [])
                return sendMessageWithResponse(extensionID, extensionID, tabId, message)
            },
        }
    }

    function createBrowserStorage(): Partial<typeof browser.storage> {
        const local: browser.storage.StorageArea = {
            clear() {
                return FrameworkRPC['browser.storage.local.clear'](extensionID)
            },
            remove(...args) {
                return FrameworkRPC['browser.storage.local.remove'](extensionID, ...args)
            },
            set(...args) {
                return FrameworkRPC['browser.storage.local.set'](extensionID, ...args)
            },
            async get(keys) {
                /** Host not accepting { a: 1 } as keys */
                if (Array.isArray(keys)) {
                    // no need to change
                } else if (typeof keys === 'string') keys = [keys]
                else if (typeof keys === 'object') {
                    if (keys === null) keys = null
                    else keys = Object.keys(keys)
                } else keys = null

                const result = await FrameworkRPC['browser.storage.local.get'](extensionID, keys)

                if (Array.isArray(keys)) return result
                else if (typeof keys === 'object' && keys !== null) {
                    return { ...(keys as object), ...result }
                }
                return result
            },
        }
        return { local }
    }

    function createWebNavigation(): Partial<typeof browser.webNavigation> {
        return {
            onCommitted: createEventListener(extensionID, 'browser.webNavigation.onCommitted'),
            onCompleted: createEventListener(extensionID, 'browser.webNavigation.onCompleted'),
            onDOMContentLoaded: createEventListener(extensionID, 'browser.webNavigation.onDOMContentLoaded'),
        }
    }

    function createBrowserPermission(): Partial<typeof browser.permissions> {
        return {
            request: async (req) => {
                const userAction = true
                if (userAction) {
                    getInternalStorage(extensionID, (store) => {
                        const old = store.dynamicRequestedPermissions || { origins: [], permissions: [] }
                        const origins = new Set(old.origins)
                        const permissions = new Set(old.permissions)
                        ;(req.origins || []).forEach((x) => origins.add(x))
                        ;(req.permissions || []).forEach((x) => permissions.add(x))
                        old.origins = Array.from(origins)
                        old.permissions = Array.from(permissions)
                        store.dynamicRequestedPermissions = old
                    })
                }
                return userAction
            },
            contains: async (query) => {
                const originsQuery = query.origins || []
                const permissionsQuery = query.permissions || []
                const requested = await getInternalStorage(extensionID)

                const hasOrigins = new Set<string>()
                const hasPermissions = new Set<string>()
                requested.dynamicRequestedPermissions?.origins.forEach((x) => hasOrigins.add(x))
                requested.dynamicRequestedPermissions?.permissions.forEach((x) => hasPermissions.add(x))

                // permissions does not distinguish permission or url
                ;(manifest.permissions || []).forEach((x) => hasPermissions.add(x))
                ;(manifest.permissions || []).forEach((x) => hasOrigins.add(x))
                if (originsQuery.some((x) => !hasOrigins.has(x))) return false
                if (permissionsQuery.some((x) => !hasPermissions.has(x))) return false
                return true
            },
            remove: async () => false,
            getAll: async () => {
                const all = await getInternalStorage(extensionID)
                return JSON.parse(JSON.stringify(all.dynamicRequestedPermissions || {}))
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
