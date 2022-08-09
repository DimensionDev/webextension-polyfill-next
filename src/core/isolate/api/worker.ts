import type { CloneKnowledge } from '@masknet/intrinsic-snapshot'
import { isDebugMode } from '../../debugger/enabled.js'
import { NewPromiseCapability } from '../../utils/promise.js'
import { getExtensionOrigin } from '../../utils/url.js'

export function supportWorker(extensionID: string, global: typeof globalThis) {
    global.Worker = createWorker(extensionID)!
}
export function supportWorker_debug(extensionID: string, knowledge: CloneKnowledge) {
    knowledge.clonedFromOriginal.set(Worker, createWorker(extensionID)!)
}

const RealWorker = typeof Worker === 'function' ? Worker : null!
type WorkerInstance = Worker
export function createWorker(extensionID: string) {
    if (!RealWorker) return null
    return class Worker extends EventTarget implements WorkerInstance {
        #realWorker: WorkerInstance
        #ready = NewPromiseCapability<void>()
        constructor(scriptURL: string | URL, options?: WorkerOptions | undefined) {
            super()

            const clonedOptions: WorkerOptions = isDebugMode ? { type: 'module' } : {}
            const name = options?.name
            if (name) clonedOptions.name = name

            this.#realWorker = new RealWorker(
                isDebugMode ? '/dist/worker/index.js' : '__normal_worker__.js',
                clonedOptions,
            )

            this.#realWorker.addEventListener(
                'message',
                () => {
                    this.#realWorker.postMessage(new URL(scriptURL, getExtensionOrigin(extensionID)).toString())
                    this.#realWorker.addEventListener(
                        'message',
                        () => {
                            this.#ready.Resolve()
                            this.#realWorker.addEventListener('message', (event) => this.dispatchEvent(event))
                            this.#realWorker.addEventListener('error', (event) => this.dispatchEvent(event))
                            this.#realWorker.addEventListener('messageerror', (event) => this.dispatchEvent(event))
                        },
                        { once: true },
                    )
                },
                { once: true },
            )
        }
        postMessage(message: unknown, options?: any): void {
            if (this.#ready.Status === 'Pending') {
                this.#ready.Promise = this.#ready.Promise.then(() => this.#realWorker.postMessage(message, options))
            } else {
                this.#realWorker.postMessage(message, options)
            }
        }
        terminate(): void {
            this.#realWorker.terminate()
        }
        set onmessage(val: ((this: WorkerInstance, ev: MessageEvent<any>) => any) | null) {
            throw new Error('Unsupported')
        }
        set onmessageerror(val: ((this: WorkerInstance, ev: MessageEvent<any>) => any) | null) {
            throw new Error('Unsupported')
        }
        set onerror(val: ((this: AbstractWorker, ev: ErrorEvent) => any) | null) {
            throw new Error('Unsupported')
        }
    }
}
