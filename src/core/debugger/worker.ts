import type { CloneKnowledge } from '@masknet/intrinsic-snapshot'
import { debugModeURLRewrite } from './url.js'

/** @internal */
export function supportWorker_debug(extensionID: string, knowledge: CloneKnowledge) {
    knowledge.emptyObjectOverride.set(Worker, function (scriptURL: string | URL, options?: WorkerOptions | undefined) {
        const url = debugModeURLRewrite(extensionID, new URL(scriptURL))
        return Reflect.construct(Worker, [url, options])
    })
}
