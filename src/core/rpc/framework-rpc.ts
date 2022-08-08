import { AsyncCall } from 'async-call-rpc'
import type { FrameworkImplementation, FrameworkMayInvokeMethods } from '../../types/RPC.js'
import { isDebugMode } from '../debugger/enabled.js'
import { WebkitChannel } from './framework-channel.js'
import { SamePageDebugChannel } from './debug-channel.js'
import {
    dispatchNormalEvent,
    dispatchPortEvent,
    TwoWayMessagePromiseResolver,
} from '../isolate/api/browser/listener.js'
import { internalRPCChannel } from './internal-channel.js'
import { onNormalMessage } from '../isolate/api/browser/message.js'
import { createPort } from '../isolate/api/browser/port.js'

/** Don't call this directly! Call FrameworkRPC.* instead */
const ThisSideImplementation: FrameworkMayInvokeMethods = {
    // todo: check dispatch target's manifest
    'browser.webNavigation.onCommitted': dispatchNormalEvent.bind(null, 'browser.webNavigation.onCommitted', '*'),
    'browser.webNavigation.onDOMContentLoaded': dispatchNormalEvent.bind(
        null,
        'browser.webNavigation.onDOMContentLoaded',
        '*',
    ),
    'browser.webNavigation.onCompleted': dispatchNormalEvent.bind(null, 'browser.webNavigation.onCompleted', '*'),
    async onMessage(extensionID, toExtensionID, messageID, message, sender) {
        switch (message.type) {
            case 'internal-rpc':
                return internalRPCChannel.onReceiveMessage(message.message)
            case 'message': {
                // ? this is a response to the message
                if (TwoWayMessagePromiseResolver.has(messageID) && message.response) {
                    const [resolve, reject] = TwoWayMessagePromiseResolver.get(messageID)!
                    resolve(message.data)
                    TwoWayMessagePromiseResolver.delete(messageID)
                } else if (message.response === false) {
                    onNormalMessage(message.data, sender, toExtensionID, extensionID, messageID)
                } else {
                    // ? drop the message
                }
                break
            }
            case 'onWebNavigationChanged': {
                if (!sender.tab || sender.tab.id === undefined) break
                const param = {
                    tabId: sender.tab.id,
                    url: message.location,
                }
                switch (message.status) {
                    case 'onCommitted':
                        ThisSideImplementation['browser.webNavigation.onCommitted'](param)
                        break
                    case 'onCompleted':
                        ThisSideImplementation['browser.webNavigation.onCompleted'](param)
                        break
                    case 'onDOMContentLoaded':
                        ThisSideImplementation['browser.webNavigation.onDOMContentLoaded'](param)
                        break
                    case 'onHistoryStateUpdated':
                        // TODO: not implemented
                        break
                }
                break
            }
            case 'onPortCreate':
                return dispatchNormalEvent<[browser.runtime.Port]>(
                    'browser.runtime.onConnect',
                    extensionID,
                    createPort(extensionID, message.portID, sender, undefined, { name: message.name }),
                )
            case 'onPortMessage':
                return dispatchPortEvent('message', message.portID, message.message)
            case 'onPortDisconnect':
                return dispatchPortEvent('disconnected', message.portID, undefined)
            default:
                break
        }
    },
}
export const FrameworkRPC = AsyncCall<FrameworkImplementation>(ThisSideImplementation, {
    log: false,
    channel: isDebugMode ? new SamePageDebugChannel('client') : new WebkitChannel(),
    strict: false,
})
