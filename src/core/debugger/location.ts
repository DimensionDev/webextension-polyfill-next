import type { CloneKnowledge } from '@masknet/intrinsic-snapshot'

const intrinsic =
    typeof location === 'object'
        ? typeof importScripts === 'function'
            ? /*#__PURE__*/ Object.getOwnPropertyDescriptors(/*#__PURE__*/ Object.getPrototypeOf(location))
            : /*#__PURE__*/ Object.getOwnPropertyDescriptors(location)
        : null

/**
 * Add support for mocking a fake Location object for debugging.
 * @param mockingURL Mocking URL
 * @param knowledge
 * @param onRedirect Callback when the location is changed
 */
export function supportLocation_debug(mockingURL: URL, knowledge: CloneKnowledge, onRedirect = onDebugRedirect) {
    if (!intrinsic) return
    const { emptyObjectOverride, descriptorOverride } = knowledge
    // skip ancestorOrigins, reload

    if (intrinsic.assign) {
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
    }

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

export function supportWorkerLocation_debug(mockingURL: URL, knowledge: CloneKnowledge) {
    supportLocation_debug(mockingURL, knowledge, () => {
        throw new TypeError()
    })
}
function onDebugRedirect(url: string) {
    const search = new URLSearchParams(location.search)
    search.set('url', url)
    location.search = search.toString()
}
