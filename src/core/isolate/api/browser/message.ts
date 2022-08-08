import { FrameworkRPC } from '../../../rpc/framework.js'
import { EventStore, TwoWayMessagePromiseResolver } from './listener.js'

/**
 * Create browser.runtime.sendMessage() function
 * @param extensionID
 */
export function createRuntimeSendMessage(extensionID: string) {
    return function () {
        let toExtensionID: string, message: unknown
        if (arguments.length === 1) {
            toExtensionID = extensionID
            message = arguments[0]
        } else if (arguments.length === 2) {
            toExtensionID = arguments[0]
            message = arguments[1]
        } else {
            toExtensionID = ''
        }
        return sendMessageWithResponse(extensionID, toExtensionID, null, message)
    }
}

/**
 * Send a runtime.sendMessage()
 * @param extensionID Extension that send this message
 * @param toExtensionID Extension that receive this message
 * @param tabId The target tabID of this message
 * @param message The message
 * @returns A promise containing the possible response.
 */
export function sendMessageWithResponse<Response>(
    extensionID: string,
    toExtensionID: string,
    tabId: number | null,
    message: unknown,
) {
    return new Promise<Response>((resolve, reject) => {
        const messageID = Math.random().toString()
        FrameworkRPC.sendMessage(extensionID, toExtensionID, tabId, messageID, {
            type: 'message',
            data: message,
            response: false,
        }).catch((e) => {
            reject(e)
            TwoWayMessagePromiseResolver.delete(messageID)
        })
        TwoWayMessagePromiseResolver.set(messageID, [resolve, reject])
    })
}

/**
 * Message handler of normal message
 */
export function onNormalMessage(
    message: any,
    sender: browser.runtime.MessageSender,
    toExtensionID: string,
    extensionID: string,
    messageID: string,
) {
    const listeners = EventStore['browser.runtime.onMessage'].get(toExtensionID)
    if (!listeners) return
    let responseSend = false
    for (const listener of listeners) {
        try {
            // ? dispatch message
            const result = listener(
                JSON.parse(JSON.stringify(message)),
                JSON.parse(JSON.stringify(sender)),
                sendResponse,
            )
            if (result === undefined) {
                // ? do nothing
            } else if (typeof result === 'boolean') {
                // ! do what ? this is the deprecated path
            } else if (typeof result === 'object' && typeof result.then === 'function') {
                // ? response the answer
                Promise.resolve(result).then((data) => {
                    if (data === undefined) return
                    sendResponse(data)
                })
            }
        } catch (e) {
            console.error(e)
        }
    }
    function sendResponse(data: unknown) {
        if (responseSend) return false
        responseSend = true
        FrameworkRPC.sendMessage(toExtensionID, extensionID, sender.tab!.id!, messageID, {
            data,
            response: true,
            type: 'message',
        })
        return true
    }
}
