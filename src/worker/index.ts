import '../core/ses.js'
import { ModuleLoader } from '../core/isolate/loader.js'
import { isDebugMode } from '../core/debugger/enabled.js'
import type { CloneKnowledge } from '@masknet/intrinsic-snapshot'
import { supportWorkerLocation_debug } from '../core/debugger/location.js'
import { getExtensionIDFromURL, locationDebugModeAware } from '../core/utils/url.js'
import { WebExtensionIsolate } from '../core/isolate/isolate.js'

const baseURL = locationDebugModeAware()
const extensionID = getExtensionIDFromURL(baseURL.toString())
const manifest = new URLSearchParams(location.search).get('manifest')!
if (!extensionID || !manifest) throw new Error('Cannot start a Worker without an extension context.')

if (isDebugMode) {
    const { clone, undeniable } = await import('../../node_modules/@masknet/intrinsic-snapshot/dist/index.js')
    const knowledge: CloneKnowledge = {
        clonedFromOriginal: new WeakMap(),
        descriptorOverride: new WeakMap(),
        emptyObjectOverride: new WeakMap(),
    }
    knowledge.clonedFromOriginal.set(console, console)
    undeniable.forEach((x) => knowledge.clonedFromOriginal.set(x, x))
    supportWorkerLocation_debug(new URL(baseURL.toString()), knowledge)
    const WorkerGlobalScope = Object.getPrototypeOf(Object.getPrototypeOf(self))
    const nextLocation = clone(location, knowledge)
    Object.defineProperty(WorkerGlobalScope, 'location', {
        configurable: true,
        enumerable: true,
        get: () => nextLocation,
    })
    WorkerLocation = nextLocation.constructor as any
}

new WebExtensionIsolate(extensionID, {})
const loader = new ModuleLoader(baseURL.toString(), globalThis)
loader.import(baseURL.toString())
