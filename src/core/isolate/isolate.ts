import { Evaluators, imports, Module, ModuleNamespace, VirtualModuleRecord } from '@masknet/compartment'
import { clone, CloneKnowledge } from '@masknet/intrinsic-snapshot'
import type { NormalizedManifest } from '../../types/manifest.js'
import { getExtensionOrigin, locationDebugModeAware } from '../utils/url.js'
import { supportLocation_mock } from '../debugger/location.js'
import { isDebugMode } from '../debugger/enabled.js'
import { supportWorker_debug } from '../debugger/worker.js'
import { supportObjectURL } from './api/URL.js'
import { supportOpenAndClose } from './api/open-close.js'
import { rejectEvaluator } from './api/evaluator.js'
import { NewPromiseCapability, PromiseCapability } from '../utils/promise.js'
import { createBrowser } from './api/browser/create.js'
import { createChromeFromBrowser } from './api/chrome.js'
import { debugModeURLRewrite } from '../debugger/url.js'
import { FrameworkRPC } from '../rpc/framework-rpc.js'
import { decodeStringOrBufferSource } from '../host/blob.js'

export class ModuleSourceCache {
    constructor(public id: string) {
        Object.defineProperty(globalThis, `__holoflows_extension_${id}_register__`, {
            value: (specifier: string, module: VirtualModuleRecord) => this.#moduleResolverCallback(specifier, module),
        })
    }
    #Modules = new Map<string, VirtualModuleRecord>()
    #ModuleResolveCapability = new Map<string, PromiseCapability<VirtualModuleRecord>>()
    async #HostImportModuleSource(specifier: string) {
        if (isDebugMode) {
            await import(debugModeURLRewrite(this.id, specifier).toString())
        } else {
            // TODO: add a new framework API for this
            const sourceText = await FrameworkRPC.fetch(this.id, {
                method: 'GET',
                url: specifier,
                body: null,
                headers: {},
            })
            const code = decodeStringOrBufferSource(sourceText.data)
            if (typeof code !== 'string') throw new Error(`Cannot load source file ${specifier}`)
            await FrameworkRPC.eval(this.id, code)
        }
    }
    async HostImportModuleSource(specifier: string) {
        if (this.#Modules.has(specifier)) return this.#Modules.get(specifier)!
        const capability = NewPromiseCapability<VirtualModuleRecord>()
        this.#ModuleResolveCapability.set(specifier, capability)
        this.#HostImportModuleSource(specifier).catch(capability.Reject)
        return capability.Promise
    }
    /**
     * Add a module in the isolate's cache.
     * @param specifier The module specifier.
     * @param source The VirtualModuleRecord representation of the target module.
     */
    #moduleResolverCallback(specifier: string, source: VirtualModuleRecord) {
        if (this.#Modules.has(specifier)) return
        this.#Modules.set(specifier, source)
        // Module might be preloaded, so there might be no capability.
        this.#ModuleResolveCapability.get(specifier)?.Resolve(source)
        this.#ModuleResolveCapability.delete(specifier)
    }
}
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
    constructor(public extensionID: string, public manifest: NormalizedManifest, moduleSource: ModuleSourceCache) {
        console.log(`[WebExtension] Isolate ${extensionID} created.`)
        this.#ModuleSource = moduleSource

        const knowledge: CloneKnowledge = {
            clonedFromOriginal: new WeakMap(),
            emptyObjectOverride: new WeakMap(),
            descriptorOverride: new WeakMap(),
        }
        if (isDebugMode) {
            supportWorker_debug(extensionID, knowledge)
            supportLocation_mock(new URL(locationDebugModeAware().toString()), knowledge)
        }
        supportObjectURL(extensionID, knowledge)
        supportOpenAndClose(extensionID, knowledge)
        rejectEvaluator(knowledge)

        // TODO: To be secure, we should pre-clone the globalThis at first, then clone it again for each initialization.
        // TODO: for IsolateMode.Protocol, we should try to give the direct access to the intrinsic,
        //       but we need to take care of something that can:
        //           return the reference to globalThis. But does that mean we need to clone the whole DOM?
        this.globalThis = clone(globalThis, knowledge)
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
        const code = await this.#ModuleSource.HostImportModuleSource(specifier)
        const importMeta = { __proto__: null, url: specifier } as ImportMeta
        const module = new this.#Evaluators.Module(code, { importMeta })
        this.#Modules.set(specifier, module)
        this.#ImportMetaMap.set(importMeta, module)
        this.#ModuleReverseMap.set(module, specifier)
        return module
    }
    #Evaluators: Evaluators
    #ModuleSource: ModuleSourceCache
    #Modules = new Map<string, Module>()
    #ModuleReverseMap = new Map<Module, string>()
    #ImportMetaMap = new Map<object, Module>()
}
