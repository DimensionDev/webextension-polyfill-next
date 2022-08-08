import type { EventBasedChannel } from 'async-call-rpc'
import { isDebugMode } from '../debugger/enabled.js'
import { FrameworkRPC } from './framework-rpc.js'
import { reservedID } from '../isolate/runner.js'

class WebExtensionInternalChannel implements EventBasedChannel {
    public listener: Set<(data: unknown) => void> = new Set()
    on(cb: (data: any) => void) {
        this.listener.add(cb)
        return () => this.listener.delete(cb)
    }
    onReceiveMessage(data: JSONRPCRequest): void {
        for (const listener of this.listener) {
            try {
                listener(data)
            } catch {}
        }
    }
    send(data: JSONRPCRequest): void {
        if (isDebugMode) console.log('send', data)

        if (!(typeof data === 'object')) return
        if (data.method) {
            if (!Array.isArray(data.params)) return
            if (typeof data.params[0] !== 'number')
                throw new Error(`Every method of InternalRPCMethods must start with parameter 0 as targetTabID: number`)
            FrameworkRPC.sendMessage(reservedID, reservedID, data.params[0], Math.random() + '', {
                type: 'internal-rpc',
                message: data,
            })
            return
        } else {
            FrameworkRPC.sendMessage(reservedID, reservedID, null, Math.random() + '', {
                type: 'internal-rpc',
                message: data,
            })
        }
    }
}
export const internalRPCChannel = new WebExtensionInternalChannel()

interface JSONRPCRequest {
    jsonrpc: '2.0'
    id: number | string | null
    method: string
    params: unknown[] | object
}
