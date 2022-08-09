import { getExtensionOrigin } from '../utils/url.js'
import { isDebugMode } from './enabled.js'

/**
 * Parse the mocking URL in the debug mode.
 */
export function parseDebugModeURL(): URL {
    const param = new URLSearchParams(location.search)
    let src = param.get('src')
    if (!src) throw new TypeError('Wait for the mocking url...')
    return new URL(src!)
}

/**
 * Write a URL to it's debug version:
 *
 * `holoflows-extension://extension-id/data.json` becomes `http://127.0.0.1/extension/extension-id/data.json`
 * @param extensionID The extension ID
 * @param url URL
 * @returns Mocking URL
 */
export function debugModeURLRewrite(extensionID: string, url: string | URL): URL {
    if (!isDebugMode) return new URL(url)
    const u = new URL(url, getExtensionOrigin(extensionID))
    if (u.protocol === 'holoflows-extension:') {
        u.protocol = location.protocol
        u.host = location.host
        u.pathname = '/extension/' + extensionID + u.pathname
        console.debug('Rewrite ', url, 'to', u.toJSON())
        return u
    } else if (u.origin === location.origin) {
        if (u.pathname.startsWith('/extension/')) return new URL(url)
        u.pathname = '/extension/' + extensionID + u.pathname
        console.debug('Rewrite ', url, 'to', u.toJSON())
        return u
    }
    return new URL(url)
}
