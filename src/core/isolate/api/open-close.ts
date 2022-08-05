// navigator.userActivation is not shipped on Safari. Let's skip it.

import type { CloneKnowledge } from '@masknet/intrinsic-snapshot'

export function supportOpenAndClose(extensionID: string, knowledge: CloneKnowledge) {
    knowledge.emptyObjectOverride.set(open, openHost(extensionID))
    knowledge.emptyObjectOverride.set(close, closeHost(extensionID))
}
function openHost(extensionID: string): typeof open {
    return (url = 'about:blank', target?: string, features?: string, replace?: boolean) => {
        // if (!navigator.userActivation.isActive) return null
        if ((target && target !== '_blank') || features || replace) {
            console.warn('Unsupported open', url, target, features, replace)
        }
        // TODO: call host
        // FrameworkRPC['browser.tabs.create'](extensionID, {
        //     active: true,
        //     url,
        // })
        return null
    }
}

export function closeHost(extensionID: string): typeof close {
    return () => {
        // if (!navigator.userActivation.isActive) return
        // TODO: call host
        // FrameworkRPC['browser.tabs.query'](extensionID, { active: true }).then(i =>
        //     FrameworkRPC['browser.tabs.remove'](extensionID, i[0].id!),
        // )
    }
}
