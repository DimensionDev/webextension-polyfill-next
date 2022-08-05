import type { CloneKnowledge } from '@masknet/intrinsic-snapshot'
import { debugModeURLRewrite } from './entry.js'

/** @internal */
export function supportWorker_debug(extensionID: string, knowledge: CloneKnowledge) {
    knowledge.emptyObjectOverride.set(Worker, new Proxy(Worker, {
        construct(target, args, newTarget) {
            args[0] = debugModeURLRewrite(extensionID, args[0])
            return Reflect.construct(target, args, newTarget)
        },
    }))
}
