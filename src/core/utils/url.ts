import type { Background } from '../../types/manifest.js'
import { isDebugMode } from '../debugger/enabled.js'
import { parseDebugModeURL } from '../debugger/url.js'

const HEAD = 'holoflows-extension://'
export function getExtensionOrigin(extensionID: string) {
    return HEAD + extensionID + '/'
}
export function getExtensionIDFromURL(url: string | URL) {
    const text = url.toString()
    if (text.startsWith(HEAD)) return text.slice(HEAD.length, text.indexOf('/', HEAD.length))
    return null
}
export function isExtensionOrigin() {
    return locationDebugModeAware().protocol === 'holoflows-extension:'
}
export function locationDebugModeAware() {
    if (isDebugMode) return parseDebugModeURL()
    return location
}
export function isBackground(id: string, bg: Background) {
    const url = locationDebugModeAware()
    if (bg.kind === 'page' && url.pathname === new URL(bg.page, getExtensionOrigin(id)).toString()) return true
    if (bg.kind === 'scripts' && url.pathname === '/_generated_background_page.html') return true
    // TODO: need native suppport
    if (bg.kind === 'worker' && url.pathname === '/_generated_background_worker.js') return true
    return false
}

export function getBackgroundPageURL(id: string, bg: Background): URL {
    if (bg.kind === 'page') return new URL(bg.page, getExtensionOrigin(id))
    if (bg.kind === 'scripts') return new URL('/_generated_background_page.html', getExtensionOrigin(id))
    throw new Error('This feature is not available in Manifest V3')
}
