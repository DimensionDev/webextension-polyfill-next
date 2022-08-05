import type { CloneKnowledge } from '@masknet/intrinsic-snapshot'

const intrinsic = typeof location === 'object' ? Object.getOwnPropertyDescriptors(location) : null

/** @internal */
export function supportLocation_debug(mockingURL: URL, knowledge: CloneKnowledge, onRedirect = onDebugRedirect) {
    if (!intrinsic) return
    const { emptyObjectOverride, descriptorOverride } = knowledge
    // skip ancestorOrigins, reload

    emptyObjectOverride.set(intrinsic.assign.value!, (url: string) => {
        if (typeof url !== 'string') throw new TypeError('URL must be a string.')
        mockingURL = new URL(url, mockingURL)
        onRedirect(mockingURL.href)
    })
    emptyObjectOverride.set(intrinsic.replace.value!, (url: string) => {
        if (typeof url !== 'string') throw new TypeError('URL must be a string.')
        mockingURL = new URL(url, mockingURL)
        onRedirect(mockingURL.href)
    })

    descriptorOverride.set(location, {
        toString: { value: () => mockingURL.href },
        valueOf: { value: () => mockingURL.href },
        [Symbol.toPrimitive]: { value: () => mockingURL.href },
    })

    const key = ['hash', 'host', 'hostname', 'href', 'origin', 'pathname', 'port', 'protocol', 'search'] as const
    for (const k of key) {
        emptyObjectOverride.set(intrinsic[k].get!, () => mockingURL[k])
        const setter = intrinsic[k].set
        setter &&
            emptyObjectOverride.set(setter, (part: string) => {
                const newOne = new URL(mockingURL)
                Reflect.set(newOne, k, part) // some properties might throw
                mockingURL = newOne
                onRedirect(mockingURL.href)
            })
    }
}
function onDebugRedirect(url: string) {
    const search = new URLSearchParams(location.search)
    search.set('url', url)
    location.search = search.toString()
}
