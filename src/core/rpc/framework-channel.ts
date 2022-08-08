/// <reference path="../../types/globals.d.ts" />
import type { EventBasedChannel } from 'async-call-rpc'
import { isDebugMode } from '../debugger/enabled.js'

const key = 'holoflowsjsonrpc'
export class WebkitChannel implements EventBasedChannel {
    constructor() {
        document.addEventListener(key, (e) => {
            const detail = (e as CustomEvent<any>).detail
            for (const f of this.listener) {
                try {
                    f(detail)
                } catch {}
            }
        })
    }
    private listener: Set<(data: unknown) => void> = new Set()
    on(cb: (data: any) => void) {
        this.listener.add(cb)
        return () => this.listener.delete(cb)
    }
    send(data: any): void {
        if (isDebugMode) {
            console.log('send', data)
        }
        const handler = window.webkit?.messageHandlers?.[key]
        if (handler) handler.postMessage(data)
    }
}
