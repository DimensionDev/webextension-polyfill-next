import type { FrameworkStringOrBinary } from '../../types/RPC.js'

/**
 * Encode a string/Blob/BufferSource to the format that can be recognized by the Framework side.
 */
export async function encodeStringOrBufferSource(val: Blob | string | BufferSource): Promise<FrameworkStringOrBinary> {
    if (typeof val === 'string') return { type: 'text', content: val }
    if (val instanceof Blob) {
        const buffer = new Uint8Array(await new Response(val).arrayBuffer())
        return { type: 'blob', mimeType: val.type, content: Uint8ArrayToBase64(buffer) }
    }
    if (val instanceof ArrayBuffer) {
        return { type: 'array buffer', content: Uint8ArrayToBase64(new Uint8Array(val)) }
    }
    if ('buffer' in val && val.buffer instanceof ArrayBuffer) {
        return encodeStringOrBufferSource(val.buffer)
    }
    console.error(val)
    throw new TypeError('Invalid type')
}

/**
 * Decode a string/Blob/BufferSource from the format that returned by the Framework side.
 */
export function decodeStringOrBufferSource(val: FrameworkStringOrBinary): Blob | string | ArrayBuffer | null {
    if (val.type === 'text') return val.content
    if (val.type === 'blob') return new Blob([Uint8ArrayFromBase64(val.content)], { type: val.mimeType })
    if (val.type === 'array buffer') {
        return Uint8ArrayFromBase64(val.content).buffer
    }
    return null
}

function Uint8ArrayFromBase64(sBase64: string): Uint8Array {
    return Uint8Array.from(atob(sBase64), (c) => c.charCodeAt(0))
}

function Uint8ArrayToBase64(aBytes: Uint8Array): string {
    return btoa(
        Array(aBytes.length)
            .fill('')
            .map((_, i) => String.fromCharCode(aBytes[i]!))
            .join(''),
    )
}
