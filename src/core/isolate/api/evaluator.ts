import type { CloneKnowledge } from '@masknet/intrinsic-snapshot'

export function rejectEvaluator(knowledge: CloneKnowledge) {
    knowledge.emptyObjectOverride.set(eval, () => {
        throw new EvalError()
    })
    knowledge.emptyObjectOverride.set(Function, () => {
        throw new EvalError()
    })
}
