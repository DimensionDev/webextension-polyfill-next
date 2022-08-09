import './ses.js'
import { ModuleLoader } from '../core/isolate/loader.js'
import { isDebugMode } from '../core/debugger/enabled.js'
import { supportWorker, supportWorker_debug } from '../core/isolate/api/worker.js'
import { getExtensionIDFromURL } from '../core/utils/url.js'
import type { CloneKnowledge } from '@masknet/intrinsic-snapshot'
import { supportWorkerLocation_debug } from '../core/debugger/location.js'

// ping alive
self.postMessage('')
self.addEventListener(
    'message',
    async (event) => {
        const baseURL = String((event as any).data)
        const extensionID = getExtensionIDFromURL(baseURL)
        if (!extensionID) throw new TypeError('Invalid state: No extension ID.')

        let global: typeof globalThis
        if (isDebugMode) {
            const { clone, undeniable } = await import('../../node_modules/@masknet/intrinsic-snapshot/dist/index.js')
            const knowledge: CloneKnowledge = {
                clonedFromOriginal: new WeakMap(),
                descriptorOverride: new WeakMap(),
                emptyObjectOverride: new WeakMap(),
            }
            knowledge.clonedFromOriginal.set(console, console)
            undeniable.forEach((x) => knowledge.clonedFromOriginal.set(x, x))
            supportWorkerLocation_debug(new URL(baseURL), knowledge)
            supportWorker_debug(extensionID, knowledge)
            global = clone(globalThis, knowledge) as typeof globalThis
        } else {
            global = globalThis
            supportWorker(extensionID, globalThis)
        }
        const loader = new ModuleLoader(baseURL, global)

        // ping ready
        self.postMessage('')

        await loader.import(baseURL)
    },
    { once: true },
)
