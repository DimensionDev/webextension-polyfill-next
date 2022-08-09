import type { CloneKnowledge } from '@masknet/intrinsic-snapshot'
import { isDebugMode } from '../../debugger/enabled.js'
import { debugModeURLRewrite } from '../../debugger/url.js'
import { decodeStringOrBufferSource, encodeStringOrBufferSource } from '../../host/blob.js'
import { FrameworkRPC } from '../../rpc/framework-rpc.js'
import { getExtensionOrigin } from '../../utils/url.js'

const origFetch = globalThis.fetch
export function supportFetch(extensionID: string, global: typeof globalThis) {
    global.fetch = createFetch(extensionID)
}
export function supportFetch_debug(extensionID: string, knowledge: CloneKnowledge) {
    knowledge.emptyObjectOverride.set(origFetch, createFetch(extensionID))
}
function createFetch(extensionID: string): typeof fetch {
    return async function fetch(requestInfo, requestInit) {
        const request = new Request(requestInfo, requestInit)
        const url = new URL(request.url)

        // Note: we cannot use headers from request.headers, because it will remove some headers due to security reason
        // e.g. "Referer"
        let headers: Record<string, string> = {}
        {
            const originalHeaders = requestInit?.headers || {}
            if (originalHeaders instanceof Headers || Array.isArray(originalHeaders)) {
                headers = Object.fromEntries(originalHeaders)
            } else {
                headers = originalHeaders
            }
        }

        // Debug mode
        if (isDebugMode && (url.origin === location.origin || url.protocol === 'holoflows-extension:')) {
            return origFetch(debugModeURLRewrite(extensionID, request.url), requestInit)
        } else if (request.url.startsWith(getExtensionOrigin(extensionID))) {
            return origFetch(requestInfo, requestInit)
        } else {
            if (isDebugMode) return origFetch(requestInfo, requestInit)
            const { method, body } = request
            const result = await FrameworkRPC.fetch(extensionID, {
                method,
                url: url.toJSON(),
                body: await reader(body),
                headers,
            })
            const data = decodeStringOrBufferSource(result.data)
            if (data === null) throw new Error('')
            const returnValue = new Response(data, result)
            return returnValue
        }
    }
}
async function reader(body: ReadableStream<Uint8Array> | null) {
    if (!body) return null
    const iter = body.getReader()
    const u: Uint8Array[] = []
    for await (const i of read(iter)) u.push(i)
    return encodeStringOrBufferSource(new Uint8Array(flat_iter(u)))
}
function* flat_iter(args: Uint8Array[]) {
    for (const each of args) yield* each
}
async function* read<T>(iter: ReadableStreamDefaultReader<T>) {
    let result = await iter.read()
    while (!result.done) {
        yield result.value
        result = await iter.read()
    }
}
