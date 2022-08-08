type WebExtensionID = string
type MessageID = string
type Events = keyof typeof EventStore

/**
 * Used for keep reference to browser.runtime.onMessage
 */
export const TwoWayMessagePromiseResolver = new Map<
    MessageID,
    [resolve: (val: any) => any, reject: (val: any) => any]
>()
type EventStore = Map<WebExtensionID, Set<Function>>
type PortStore = Map<PortID, Set<Function>>
type PortID = string
/**
 * Listeners of events.
 */
export const EventStore = {
    'browser.webNavigation.onCommitted': new Map() as EventStore,
    'browser.webNavigation.onDOMContentLoaded': new Map() as EventStore,
    'browser.webNavigation.onCompleted': new Map() as EventStore,
    'browser.runtime.onMessage': new Map() as EventStore,
    'browser.runtime.onInstall': new Map() as EventStore,
    'browser.runtime.onConnect': new Map() as EventStore,
    'browser.runtime.onConnect:Port:onMessage': new Map() as PortStore,
    'browser.runtime.onConnect:Port:onDisconnect': new Map() as PortStore,
} as const

/**
 * Dispatch a normal event that not have a "response".
 * e.g. browser.webNavigation.onCommitted
 */
export async function dispatchNormalEvent<T extends any[]>(
    event: Events,
    targetExtensionID: string | string[] | '*',
    ...args: T
) {
    if (!EventStore[event]) return
    for (const [currentExtensionID, listeners] of EventStore[event]) {
        if (Array.isArray(targetExtensionID) && !targetExtensionID.includes(currentExtensionID)) continue
        if (!Array.isArray(targetExtensionID) && targetExtensionID !== currentExtensionID && targetExtensionID !== '*')
            continue
        for (const listener of listeners) {
            try {
                listener(...args)
            } catch (e) {
                console.error(e)
            }
        }
    }
}

/**
 * Dispatch a message on the Port.
 */
export async function dispatchPortEvent(event: 'disconnected' | 'message', toPortID: string, message: unknown) {
    const store =
        event === 'message'
            ? EventStore['browser.runtime.onConnect:Port:onMessage']
            : EventStore['browser.runtime.onConnect:Port:onDisconnect']
    if (!store) return
    const portID = 'port://' + toPortID
    const listeners = store.get(portID)
    if (!listeners) return
    for (const listener of listeners) {
        try {
            listener(message)
        } catch (e) {
            console.error(e)
        }
    }
}

/**
 * Create a port listener object.
 */
export function createPortListener(portID: PortID, event: 'disconnected' | 'message') {
    return createEventListener(
        'port://' + portID,
        event === 'disconnected'
            ? 'browser.runtime.onConnect:Port:onDisconnect'
            : 'browser.runtime.onConnect:Port:onMessage',
    )
}

/**
 * Called when destroy a port.
 */
export function clearPortListener(portID: PortID) {
    EventStore['browser.runtime.onConnect:Port:onDisconnect'].delete('port://' + portID)
    EventStore['browser.runtime.onConnect:Port:onMessage'].delete('port://' + portID)
}

/**
 * Create a `EventObject<ListenerType>` object.
 *
 * Used by browser.webNavigation.onCommitted, etc...
 */
export function createEventListener(key: WebExtensionID | PortID, event: Events): EventObject<Function> {
    if (!EventStore[event].has(key)) {
        EventStore[event].set(key, new Set())
    }
    const store = EventStore[event].get(key)!
    return {
        addListener(callback) {
            if (typeof callback !== 'function') throw new TypeError('Listener must be a function')
            store.add(callback)
        },
        removeListener(callback) {
            store.delete(callback)
        },
        hasListener(listener) {
            return store.has(listener)
        },
    }
}

export interface EventObject<T extends Function> {
    addListener: (callback: T) => void
    removeListener: (listener: T) => void
    hasListener: (listener: T) => boolean
}
