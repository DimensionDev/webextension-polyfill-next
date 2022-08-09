import type { CloneKnowledge } from '@masknet/intrinsic-snapshot'
import { debugModeURLRewrite } from './url.js'

/**
 * Add URL rewrite for the Worker constructor so it can be created in the debug mode.
 * @param extensionID The extension ID
 * @param knowledge
 */
export function supportWorker_debug_only(extensionID: string, knowledge: CloneKnowledge) {
    knowledge.emptyObjectOverride.set(Worker, function (scriptURL: string | URL, options?: WorkerOptions | undefined) {
        const url = debugModeURLRewrite(extensionID, new URL(scriptURL))
        return Reflect.construct(Worker, [url, options])
    })
}
