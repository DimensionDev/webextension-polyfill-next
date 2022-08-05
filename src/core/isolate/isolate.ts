import { Evaluators, imports, Module, ModuleNamespace, VirtualModuleRecord } from '@masknet/compartment'
import { clone, CloneKnowledge } from '@masknet/intrinsic-snapshot'
import type { NormalizedManifest } from '../../types/manifest.js'
import { locationDebugModeAware } from '../utils/url.js'
import { supportLocation_debug } from '../debugger/location.js'
import { isDebugMode } from '../debugger/enabled.js'
import { supportWorker_debug } from '../debugger/worker.js'
import { supportObjectURL } from './api/URL.js'
import { supportOpenAndClose } from './api/open-close.js'
import { rejectEvaluator } from './api/evaluator.js'
import { NewPromiseCapability, PromiseCapability } from '../utils/promise.js'

export const enum IsolateMode {
    Protocol,
    ContentScript,
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
        return this.#ResolveModule(specifier).then(imports)
    }
    /**
     * Add a module in the isolate's cache.
     * @param specifier The module specifier.
     * @param source The VirtualModuleRecord representation of the target module.
     */
    // This function should be each-instance.
    moduleResolverCallback = (specifier: string, source: VirtualModuleRecord) => {
        if (this.#Modules.has(specifier)) throw new TypeError(`Module ${specifier} has already been resolved.`)

        const meta = { url: specifier }
        const module = new this.#Evaluators.Module(source, { importMeta: meta })
        this.#Modules.set(specifier, module)
        this.#ModuleReverseMap.set(module, specifier)
        this.#ImportMetaMap.set(meta, module)
        this.#ModuleResolveCapability.get(specifier)?.Resolve(module)
        this.#ModuleResolveCapability.delete(specifier)
    }
    /**
     * Create an extension environment for an extension.
     * @param extensionID The extension ID.
     * @param manifest The manifest of the extension.
     */
    constructor(public extensionID: string, public manifest: NormalizedManifest) {
        console.log(`[WebExtension] Isolate ${extensionID} created.`)

        const knowledge: CloneKnowledge = {
            clonedFromOriginal: new WeakMap(),
            emptyObjectOverride: new WeakMap(),
            descriptorOverride: new WeakMap(),
        }
        if (isDebugMode) {
            supportWorker_debug(extensionID, knowledge)
            supportLocation_debug(new URL(locationDebugModeAware().toString()), knowledge)
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
        // TODO: define browser and chrome.
        // TODO: define fetch
    }
    #importHook(importSpecifier: string, importMeta: object): Promise<Module> {
        const baseModule = this.#ImportMetaMap.get(importMeta)
        const baseURL = this.#ModuleReverseMap.get(baseModule!)
        if (!baseModule || !baseURL)
            throw new TypeError(
                `Bad state: No module can be found with the given importMeta to resolve the module import.`,
            )

        const nextURL = new URL(importSpecifier, baseURL).toString()
        return this.#ResolveModule(nextURL)
    }
    async #ResolveModule(specifier: string): Promise<Module> {
        if (this.#Modules.has(specifier)) return this.#Modules.get(specifier)!
        const cap = NewPromiseCapability<Module>()
        this.#ModuleResolveCapability.set(specifier, cap)
        return cap.Promise
    }
    #Evaluators: Evaluators
    #Modules = new Map<string, Module>()
    #ModuleReverseMap = new Map<Module, string>()
    #ImportMetaMap = new Map<object, Module>()
    #ModuleResolveCapability = new Map<string, PromiseCapability<Module>>()
}
