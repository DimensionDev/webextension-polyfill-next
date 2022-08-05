import type { Background } from '../../types/manifest.js'
import { isDebugMode } from '../debugger/enabled.js'
import { parseDebugModeURL } from '../debugger/url.js'

export function getExtensionOrigin(extensionID: string) {
    return 'holoflows-extension://' + extensionID + '/'
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
