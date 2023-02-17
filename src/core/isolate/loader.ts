import {
    Evaluators,
    imports,
    Module,
    ModuleNamespace,
    VirtualModuleRecord,
} from '../../../node_modules/@masknet/compartment/dist/index.js'
import { getExtensionIDFromURL } from '../utils/url.js'
import { isDebugMode } from '../debugger/enabled.js'
import { NewPromiseCapability, PromiseCapability } from '../utils/promise.js'
import { debugModeURLRewrite } from '../debugger/url.js'
import { FrameworkRPC } from '../rpc/framework-rpc.js'
import { decodeStringOrBufferSource } from '../host/blob.js'

export const { HostImportReflection } = (() => {
    const Modules = new Map<string, VirtualModuleRecord>()
    const ModuleResolveCapability = new Map<string, PromiseCapability<VirtualModuleRecord>>()
    // Callback of registering VirtualModuleRecord
    function HostModuleSourceRegister(specifier: string, source: VirtualModuleRecord) {
        if (Modules.has(specifier)) return
        Modules.set(specifier, source)
        // Module might be preloaded, so there might be no capability.
        ModuleResolveCapability.get(specifier)?.Resolve(source)
        ModuleResolveCapability.delete(specifier)

        harden(source)
    }
    async function importModuleSourceInner(specifier: string, extensionID: string) {
        if (isDebugMode) {
            // worker also uses this.
            await import(debugModeURLRewrite(extensionID, specifier).toString())
        } else if (typeof importScripts === 'function') {
            importScripts(specifier)
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
    async function HostImportReflection(specifier: string) {
        const extensionID = getExtensionIDFromURL(specifier)
        if (!extensionID) throw new TypeError(`Cannot import module ${specifier} out of an extensionID context.`)
        if (Modules.has(specifier)) return Modules.get(specifier)!
        const capability = NewPromiseCapability<VirtualModuleRecord>()
        ModuleResolveCapability.set(specifier, capability)
        importModuleSourceInner(specifier, extensionID).catch(capability.Reject)
        return capability.Promise
    }
    Object.defineProperties(globalThis, {
        __HostModuleSourceRegister__: { value: HostModuleSourceRegister },
        __HostImportReflection__: { value: HostImportReflection },
    })
    return { HostImportReflection }
})()

export class ModuleLoader {
    evaluators: Evaluators
    /**
     * Import a module in the current isolate.
     * @param specifier The imported module specifier.
     * @returns A Promise to the imported module's export namespace object.
     */
    import(specifier: string): Promise<ModuleNamespace> {
        return this.#ResolveModule(this.#ResolveSpecifier(specifier)).then(imports)
    }
    /**
     * Create an extension environment for an extension.
     * @param baseURL Base URL for non-absolute URL.
     * @param globalThis globalThis of this loader instance.
     */
    constructor(public readonly baseURL: string | URL, public readonly globalThis: any) {
        this.evaluators = new Evaluators({
            globalThis: this.globalThis,
            importHook: (importSpecifier, importMeta) => this.#importHook(importSpecifier, importMeta),
        })
    }
    #ResolveSpecifier(importSpecifier: string, baseURL = this.baseURL) {
        if (importSpecifier.startsWith('.') || importSpecifier.startsWith('/')) {
            return new URL(importSpecifier, this.baseURL).toString()
        }
        return importSpecifier
    }
    #importHook(importSpecifier: string, importMeta: object): Promise<Module> {
        const baseModule = this.#ImportMetaMap.get(importMeta)
        const baseURL = this.#ModuleReverseMap.get(baseModule!)
        if (!baseURL) {
            throw new TypeError(
                `Bad state: No module can be found with the given importMeta to resolve the module import.`,
            )
        }
        return this.#ResolveModule(this.#ResolveSpecifier(importSpecifier, baseURL))
    }
    async #ResolveModule(specifier: string): Promise<Module> {
        if (this.#Modules.has(specifier)) return this.#Modules.get(specifier)!
        const code = await HostImportReflection(specifier)
        const importMeta = { __proto__: null, url: specifier } as ImportMeta
        const module = new this.evaluators.Module(code, { importMeta })
        this.#Modules.set(specifier, module)
        this.#ImportMetaMap.set(importMeta, module)
        this.#ModuleReverseMap.set(module, specifier)
        return module
    }
    #Modules = new Map<string, Module>()
    #ModuleReverseMap = new Map<Module, string>()
    #ImportMetaMap = new Map<object, Module>()
}
