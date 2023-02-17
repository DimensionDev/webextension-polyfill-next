import type { ModuleNamespace } from '@masknet/compartment'
import type { CloneKnowledge } from '@masknet/intrinsic-snapshot'
import { clone, undeniable } from '../../../node_modules/@masknet/intrinsic-snapshot/dist/index.js'
import type { NormalizedManifest } from '../../types/manifest.js'
import { getExtensionOrigin, locationDebugModeAware } from '../utils/url.js'
import { supportLocation_debug } from '../debugger/location.js'
import { isDebugMode } from '../debugger/enabled.js'
import { supportObjectURL, supportObjectURL_debug } from './api/URL.js'
import { supportOpenAndClose, supportOpenAndClose_debug } from './api/open-close.js'
import { createBrowser } from './api/browser/create.js'
import { createChromeFromBrowser } from './api/chrome.js'
import { supportFetch, supportFetch_debug } from './api/fetch.js'
import { ModuleLoader } from './loader.js'
import { supportWorker, supportWorker_debug } from './api/worker.js'

export const enum IsolateMode {
    Background,
    Protocol,
    ProtocolWorker,
    ContentScript,
}
export class WebExtensionIsolate {
    /**
     * The globalThis object of the isolate.
     */
    readonly globalThis: typeof globalThis
    /**
     * Import a module in the current isolate.
     * @param specifier The imported module specifier.
     * @returns A Promise to the imported module's export namespace object.
     */
    import(specifier: string): Promise<ModuleNamespace> {
        return this.#loader.import(specifier)
    }
    #loader: ModuleLoader
    /**
     * Create an extension environment for an extension.
     * @param extensionID The extension ID.
     * @param manifest The manifest of the extension.
     * @param mode The isolate mode.
     */
    constructor(public extensionID: string, public manifest: NormalizedManifest, mode: IsolateMode) {
        console.log(`[WebExtension] Isolate ${extensionID} created.`)

        if (isDebugMode && mode === IsolateMode.ContentScript) {
            const knowledge: CloneKnowledge = {
                clonedFromOriginal: new WeakMap(),
                emptyObjectOverride: new WeakMap(),
                descriptorOverride: new WeakMap(),
            }
            knowledge.clonedFromOriginal.set(console, console)
            undeniable.forEach((x) => knowledge.clonedFromOriginal.set(x, x))
            supportFetch_debug(extensionID, knowledge)
            supportObjectURL_debug(extensionID, knowledge)
            supportWorker_debug(extensionID, knowledge)
            supportOpenAndClose_debug(extensionID, knowledge)
            supportLocation_debug(new URL(locationDebugModeAware().toString()), knowledge)
            this.globalThis = clone(globalThis, knowledge)
        } else {
            // see https://developer.apple.com/documentation/webkit/wkcontentworld
            this.globalThis = globalThis
            supportFetch(extensionID, this.globalThis)
            supportObjectURL(extensionID, this.globalThis)
            supportWorker(extensionID, this.globalThis)
            supportOpenAndClose(extensionID, this.globalThis)
        }
        this.#loader = new ModuleLoader(getExtensionOrigin(extensionID), this.globalThis)
        if (mode !== IsolateMode.ProtocolWorker) {
            const browser = createBrowser(extensionID, manifest)
            Object.assign(this.globalThis, {
                Module: this.#loader.evaluators.Module,
                browser,
                chrome: createChromeFromBrowser(browser),
            })
        }
    }
}
