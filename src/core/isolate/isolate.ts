import { Evaluators, imports, Module, ModuleNamespace, VirtualModuleRecord } from '@masknet/compartment'
import { clone, CloneKnowledge } from '@masknet/intrinsic-snapshot'
import type { NormalizedManifest } from '../../types/manifest.js'
import { getExtensionIDFromURL, getExtensionOrigin, locationDebugModeAware } from '../utils/url.js'
import { supportLocation_debug } from '../debugger/location.js'
import { isDebugMode } from '../debugger/enabled.js'
import { supportWorker_debug_only } from '../debugger/worker.js'
import { supportObjectURL, supportObjectURL_debug } from './api/URL.js'
import { supportOpenAndClose, supportOpenAndClose_debug } from './api/open-close.js'
import { rejectEvaluator_debug_only } from './api/evaluator.js'
import { NewPromiseCapability, PromiseCapability } from '../utils/promise.js'
import { createBrowser } from './api/browser/create.js'
import { createChromeFromBrowser } from './api/chrome.js'
import { debugModeURLRewrite } from '../debugger/url.js'
import { FrameworkRPC } from '../rpc/framework-rpc.js'
import { decodeStringOrBufferSource } from '../host/blob.js'

const { HostExtensionImportReflection } = (() => {
    const Modules = new Map<string, VirtualModuleRecord>()
    const ModuleResolveCapability = new Map<string, PromiseCapability<VirtualModuleRecord>>()
    // Callback of registering VirtualModuleRecord
    Object.defineProperty(globalThis, `__HostModuleSourceRegister__`, {
        value: function __HostModuleSourceRegister__(specifier: string, source: VirtualModuleRecord) {
            if (Modules.has(specifier)) return
            Modules.set(specifier, source)
            // Module might be preloaded, so there might be no capability.
            ModuleResolveCapability.get(specifier)?.Resolve(source)
            ModuleResolveCapability.delete(specifier)
        },
    })
    Object.defineProperty(globalThis, `__HostImportReflection__`, {
        value: (url: string) => HostExtensionImportReflection(url),
    })
    async function importModuleSourceInner(specifier: string, extensionID: string) {
        if (isDebugMode) {
            await import(debugModeURLRewrite(extensionID, specifier).toString())
        } else {
            // TODO: add a new framework API for this
            const sourceText = await FrameworkRPC.fetch(extensionID, {
                method: 'GET',
                url: specifier,
                body: null,
                headers: {},
            })
            const code = decodeStringOrBufferSource(sourceText.data)
            if (typeof code !== 'string') throw new Error(`Cannot load source file ${specifier}`)
            await FrameworkRPC.eval(extensionID, code)
        }
    }

    async function HostExtensionImportReflection(specifier: string, extensionID = getExtensionIDFromURL(specifier)) {
        if (!extensionID) throw new TypeError(`Cannot import module ${specifier} out of an extensionID context.`)
        if (Modules.has(specifier)) return Modules.get(specifier)!
        const capability = NewPromiseCapability<VirtualModuleRecord>()
        ModuleResolveCapability.set(specifier, capability)
        importModuleSourceInner(specifier, extensionID).catch(capability.Reject)
        return capability.Promise
    }
    return { HostExtensionImportReflection }
})()

export class WebExtensionIsolate {
    /**
     * The globalThis object of the isolate.
     */
    globalThis: typeof globalThis
    /**
     * Import a module in the current isolate.
     * @param specifier The imported module specifier.
     * @returns A Promise to the imported module's export namespace object.
     */
    import(specifier: string): Promise<ModuleNamespace> {
        return this.#ResolveModule(new URL(specifier, getExtensionOrigin(this.extensionID)).toString()).then(imports)
    }
    /**
     * Create an extension environment for an extension.
     * @param extensionID The extension ID.
     * @param manifest The manifest of the extension.
     */
    constructor(public extensionID: string, public manifest: NormalizedManifest) {
        console.log(`[WebExtension] Isolate ${extensionID} created.`)

        if (isDebugMode) {
            const knowledge: CloneKnowledge = {
                clonedFromOriginal: new WeakMap(),
                emptyObjectOverride: new WeakMap(),
                descriptorOverride: new WeakMap(),
            }
            supportObjectURL_debug(extensionID, knowledge)
            supportWorker_debug_only(extensionID, knowledge)
            supportLocation_debug(new URL(locationDebugModeAware().toString()), knowledge)
            supportOpenAndClose_debug(extensionID, knowledge)
            rejectEvaluator_debug_only(knowledge)
            this.globalThis = clone(globalThis, knowledge)
        } else {
            // see https://developer.apple.com/documentation/webkit/wkcontentworld
            this.globalThis = globalThis
            supportObjectURL(extensionID, globalThis)
            supportOpenAndClose(extensionID, globalThis)
        }
        this.#Evaluators = new Evaluators({
            globalThis: this.globalThis,
            importHook: (importSpecifier, importMeta) => this.#importHook(importSpecifier, importMeta),
        })
        const browser = createBrowser(extensionID, manifest)
        Object.defineProperty(this.globalThis, 'browser', {
            get() {
                return browser
            },
            set() {
                return true
            },
            configurable: true,
            enumerable: true,
        })
        Reflect.set(this.globalThis, 'chrome', createChromeFromBrowser(browser))
        // TODO: define fetch
    }
    #importHook(importSpecifier: string, importMeta: object): Promise<Module> {
        const baseModule = this.#ImportMetaMap.get(importMeta)
        const baseURL = this.#ModuleReverseMap.get(baseModule!)
        if (!baseModule || !baseURL) {
            throw new TypeError(
                `Bad state: No module can be found with the given importMeta to resolve the module import.`,
            )
        }

        const nextURL = new URL(importSpecifier, baseURL).toString()
        return this.#ResolveModule(nextURL)
    }
    async #ResolveModule(specifier: string): Promise<Module> {
        if (this.#Modules.has(specifier)) return this.#Modules.get(specifier)!
        const code = await HostExtensionImportReflection(specifier, this.extensionID)
        const importMeta = { __proto__: null, url: specifier } as ImportMeta
        const module = new this.#Evaluators.Module(code, { importMeta })
        this.#Modules.set(specifier, module)
        this.#ImportMetaMap.set(importMeta, module)
        this.#ModuleReverseMap.set(module, specifier)
        return module
    }
    #Evaluators: Evaluators
    #Modules = new Map<string, Module>()
    #ModuleReverseMap = new Map<Module, string>()
    #ImportMetaMap = new Map<object, Module>()
}
