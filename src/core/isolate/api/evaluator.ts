import type { CloneKnowledge } from '@masknet/intrinsic-snapshot'

export function rejectEvaluator_debug_only(knowledge: CloneKnowledge) {
    knowledge.emptyObjectOverride.set(eval, () => {
        throw new EvalError()
    })
    knowledge.emptyObjectOverride.set(Function, () => {
        throw new EvalError()
    })
}
