import type { CloneKnowledge } from '@masknet/intrinsic-snapshot'
import { isDebugMode } from '../../debugger/enabled.js'
import { getExtensionOrigin } from '../../utils/url.js'

export function supportWorker(extensionID: string, global: typeof globalThis) {
    global.Worker = createWorker(extensionID)!
}
export function supportWorker_debug(extensionID: string, knowledge: CloneKnowledge) {
    knowledge.clonedFromOriginal.set(Worker, createWorker(extensionID)!)
}

const RealWorker = typeof Worker === 'function' ? Worker : null!
function createWorker(extensionID: string) {
    if (!RealWorker) return null
    const workerProxy = isDebugMode ? '/dist/worker/index.js' : '__normal_worker__.js'
    return function Worker(scriptURL: string | URL, options?: WorkerOptions | undefined) {
        const realURL =
            workerProxy + '?src=' + encodeURIComponent(new URL(scriptURL, getExtensionOrigin(extensionID)).toString())

        const clonedOptions: WorkerOptions = isDebugMode ? { type: 'module' } : {}
        const name = options?.name
        if (name) clonedOptions.name = name
        return Reflect.construct(RealWorker, [realURL, clonedOptions])
    } as any
}
