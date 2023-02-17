import type { Background } from '../../types/manifest.js'
import { isDebugMode } from '../debugger/enabled.js'
import { parseDebugModeURL } from '../debugger/url.js'

const HEAD = 'holoflows-extension://'
const realLocation = typeof location === 'object' ? location : null!
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
    return realLocation
}
export function isBackground(id: string, bg: Background) {
    const url = locationDebugModeAware()
    if (bg.kind === 'page' && urlEq(url, new URL(bg.page, getExtensionOrigin(id)))) return true
    if (bg.kind === 'scripts' && urlEq(url, new URL('/_generated_background_page.html', getExtensionOrigin(id))))
        return true
    if (bg.kind === 'worker' && urlEq(url, new URL(bg.worker, getExtensionOrigin(id)))) return true
    return false
}

function urlEq(a: URL | Location, b: URL | Location) {
    return a.toString() === b.toString()
}
