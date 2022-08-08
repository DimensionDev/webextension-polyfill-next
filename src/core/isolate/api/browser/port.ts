import { FrameworkRPC } from "../../../rpc/framework.js"
import { clearPortListener, createPortListener } from "./listener.js"

function generateRandomID() {
    return Math.random().toString(16).slice(3)
}
type ConnectionInfo = {
    name?: string
    includeTlsChannelId?: boolean
}

/**
 * @param creatorExtensionID The creator of this port.
 * @param portID If portID is undefined, means it is a new created port and need to broadcast.
 * @param sender also for sender.
 * @param extensionId
 * @param connectionInfo
 */
export function createPort(
    creatorExtensionID: string,
    portID: string | undefined,
    sender: browser.runtime.MessageSender | undefined,
    extensionId?: string | ConnectionInfo,
    connectionInfo?: ConnectionInfo,
): browser.runtime.Port {
    if (typeof extensionId === 'string') console.warn('Cross-extension connect is not implemented yet.')
    const info = (typeof extensionId === 'string' ? connectionInfo : extensionId) ?? connectionInfo ?? { name: '' }
    const { includeTlsChannelId, name } = info
    if (includeTlsChannelId) console.warn('includeTlsChannelId is not implemented yet.')

    const newCreated = portID === undefined
    if (portID === undefined) portID = generateRandomID()
    if (newCreated) {
        FrameworkRPC.sendMessage(creatorExtensionID, creatorExtensionID, null, '', {
            type: 'onPortCreate',
            name: name!,
            portID: portID!,
        })
    }
    let disconnected = false
    const onDisconnect = createPortListener(portID, 'disconnected')
    onDisconnect.addListener(() => {
        disconnected = true
        clearPortListener(portID!)
    })
    return {
        error: undefined!,
        name: '' + name,
        sender: sender === undefined ? sender : JSON.parse(JSON.stringify(sender)),
        postMessage(message) {
            FrameworkRPC.sendMessage(creatorExtensionID, creatorExtensionID, null, '', {
                type: 'onPortMessage',
                portID: portID!,
                message,
            })
        },
        disconnect() {
            disconnected = true
            clearPortListener(portID!)
            FrameworkRPC.sendMessage(creatorExtensionID, creatorExtensionID, null, '', {
                type: 'onPortDisconnect',
                portID: portID!,
            })
        },
        onMessage: createPortListener(portID, 'message'),
        onDisconnect,
    }
}
