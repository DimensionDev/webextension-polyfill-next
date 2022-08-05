import { getExtensionOrigin } from '../utils/url.js'
import { isDebugMode } from './enabled.js'

export function parseDebugModeURL(): URL {
    const param = new URLSearchParams(location.search)
    let src = param.get('url')

    return new URL(src!)
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
