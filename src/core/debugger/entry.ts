import { Environment } from '../../types/constants.js'
import { getExtensionOrigin } from '../utils/url.js'

export const isDebugMode = location.hostname === 'localhost'
export interface BackgroundMock {
    env: Environment.Background
}
export interface ExtensionMock {
    env: Environment.ContentScript | Environment.ProtocolPage
    href: string
}
export type MockType = BackgroundMock | ExtensionMock

export function parseDebugModeURL(extensionID: string): MockType {
    const param = new URLSearchParams(location.search)
    const type = param.get('type')
    let src = param.get('url')
    const base = getExtensionOrigin(extensionID)

    if (type === 'b') return { env: Environment.Background }
    if (!src) throw new TypeError('Mocking this kind of page requires a url.')

    if (type === 'p') return { env: Environment.ProtocolPage, href: new URL(src, base).toString() }
    else if (type === 'm') return { env: Environment.ContentScript, href: src }
    else {
        throw new TypeError(
            'To debug, ?type= must be one of (b)ackground, (p)rotocol-page (holoflows-extension://.../), (c)ontent-script (used to debug content script), found ' +
                type,
        )
    }
}

export function debugModeURLRewrite(extensionID: string, url: string): string {
    if (!isDebugMode) return url
    const u = new URL(url, getExtensionOrigin(extensionID))
    if (u.protocol === 'holoflows-extension:') {
        u.protocol = location.protocol
        u.host = location.host
        u.pathname = '/extension/' + extensionID + '/' + u.pathname
        console.debug('Rewrited url', url, 'to', u.toJSON())
        return u.toJSON()
    } else if (u.origin === location.origin) {
        if (u.pathname.startsWith('/extension/')) return url
        u.pathname = '/extension/' + extensionID + u.pathname
        console.debug('Rewrited url', url, 'to', u.toJSON())
        return u.toJSON()
    }
    return url
}
