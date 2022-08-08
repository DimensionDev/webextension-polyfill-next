import { from_v2, from_v3, NormalizedManifest } from '../../types/manifest.js'
import { isDebugMode } from '../debugger/enabled.js'
import { unreachable } from '../utils/assert.js'
import { getExtensionOrigin, isBackground, isExtensionOrigin } from '../utils/url.js'
import { WebExtensionIsolate } from './isolate.js'

export const reservedID = '150ea6ee-2b0a-4587-9879-0ca5dfc1d046'
export const registeredWebExtension = new Map<string, NormalizedManifest>()
export const startedWebExtension = new Map<string, WebExtensionIsolate>()
function getProtocolExtension() {
    if (startedWebExtension.size !== 1) throw new TypeError(`Expected exactly one extension.`)
    const [pair] = startedWebExtension.entries()
    return pair!
}

export function registerWebExtension(extensionID: string, rawManifest: unknown) {
    if (registeredWebExtension.has(extensionID)) throw new TypeError(`Extension ${extensionID} already registered.`)

    const manifest = from_v3(rawManifest) || from_v2(rawManifest)
    if (!manifest) throw new TypeError(`Extension ${extensionID} does not have a valid manifest.`)

    console.debug(`[WebExtension] Loading extension ${manifest.name}(${extensionID}) with manifest`, manifest)
    registeredWebExtension.set(extensionID, manifest)
}

export async function startWebExtension(extensionID: string) {
    if (startedWebExtension.has(extensionID)) return

    const manifest = registeredWebExtension.get(extensionID)
    if (!manifest) throw new TypeError(`Extension ${extensionID} is not registered.`)

    if (isExtensionOrigin() || isDebugMode) hijackHTMLScript(() => isolate)

    const isolate: WebExtensionIsolate = new WebExtensionIsolate(extensionID, manifest)
    startedWebExtension.set(extensionID, isolate)

    if (isDebugMode) {
        Reflect.set(globalThis, 'i' + extensionID, isolate)
        Reflect.set(globalThis, 'g' + extensionID, isolate.globalThis)
        console.log(`Extension ${extensionID} registered on window.(i|g)${extensionID}`)
    }

    if (isBackground(extensionID, isolate.manifest.background)) {
        if (isolate.manifest.background.kind === 'page') {
            await executeLoadedScriptTags()
        } else if (isolate.manifest.background.kind === 'scripts') {
            for (const url of isolate.manifest.background.scripts) {
                const normalized = new URL(url, getExtensionOrigin(extensionID)).toString()
                await isolate.import(normalized)
            }
        } else if (isolate.manifest.background.kind === 'worker') {
            const normalized = new URL(isolate.manifest.background.worker, getExtensionOrigin(extensionID)).toString()
            await isolate.import(normalized)
        } else unreachable(isolate.manifest.background)
    } else if (isExtensionOrigin()) {
        await executeLoadedScriptTags()
    } else {
        // TODO: content scripts
    }
}

function hijackHTMLScript(isolate: () => WebExtensionIsolate) {
    if (!isExtensionOrigin()) throw new TypeError(`Not in extension origin.`)
    const old = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src')!

    Object.defineProperty(HTMLScriptElement.prototype, 'src', {
        ...old,
        set(this: HTMLScriptElement, src: string) {
            // the original script becomes to register a VirtualModuleRecord
            old.set!.call(this, src)
            isolate().import(src)
        },
    })
}

async function executeLoadedScriptTags() {
    if (!isExtensionOrigin()) throw new TypeError(`Not in extension origin.`)

    const [id, isolate] = getProtocolExtension()
    const executed = new WeakSet<HTMLScriptElement>()

    if (isDebugMode) executed.add(document.querySelector('[data-no-execute]')!)

    while (true) {
        for (const script of Array.from(document.getElementsByTagName('script'))) {
            if (executed.has(script)) continue
            try {
                await isolate.import(new URL(script.src, getExtensionOrigin(id)).toString())
            } catch (error) {
                console.error(error)
            }
            executed.add(script)
        }
        break
    }
}
