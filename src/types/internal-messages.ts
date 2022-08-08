export interface Message_onWebNavigationChanged {
    type: 'onWebNavigationChanged'
    // Other events seems impossible to implement
    status: 'onCommitted' | 'onDOMContentLoaded' | 'onCompleted' | 'onHistoryStateUpdated'
    location: string
}

export interface Message_internalRPC {
    type: 'internal-rpc'
    message: any
}

export interface Message_onPortCreate {
    type: 'onPortCreate'
    portID: string
    name: string
}

export interface Message_onPortMessage {
    type: 'onPortMessage'
    portID: string
    message: unknown
}

export interface Message_onPortDisconnect {
    type: 'onPortDisconnect'
    portID: string
}

export interface Message_message {
    data: any
    error?: {
        message: string
        stack: string
    }
    response: boolean
    type: 'message'
}

export type InternalMessage =
    | Message_message
    | Message_onWebNavigationChanged
    | Message_internalRPC
    | Message_onPortCreate
    | Message_onPortMessage
    | Message_onPortDisconnect
