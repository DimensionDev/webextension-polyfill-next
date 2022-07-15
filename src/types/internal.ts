export type InternalMessage =
| {
      data: any
      error?: { message: string; stack: string }
      response: boolean
      type: 'message'
  }
| {
      type: 'onWebNavigationChanged'
      // Other events seems impossible to implement
      status: 'onCommitted' | 'onDOMContentLoaded' | 'onCompleted' | 'onHistoryStateUpdated'
      location: string
  }
| { type: 'internal-rpc'; message: any }
| { type: 'onPortCreate'; portID: string; name: string }
| { type: 'onPortMessage'; portID: string; message: any }
| { type: 'onPortDisconnect'; portID: string }
