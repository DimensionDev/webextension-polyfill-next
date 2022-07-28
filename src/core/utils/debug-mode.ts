import { Environment } from '../../types/constants.js'
import type { Manifest } from '../../types/extension.js'
import { getExtensionOrigin } from './url.js'

export const isDebugMode = location.hostname === 'localhost'
export interface BackgroundMock {
    env: Environment.Background
}
export interface ExtensionMock {
    env: Environment.ContentScript | Environment.ProtocolPage
    href: string
}
export type MockType = BackgroundMock | ExtensionMock

export function parseDebugModeURL(extensionID: string, manifest: Manifest): MockType {
    const param = new URLSearchParams(location.search)
    const type = param.get('type')
    let src = param.get('url')
    const base = getExtensionOrigin(extensionID)
    if (src === '_options_') src = new URL(manifest.options_ui!.page, base).toString()
    if (src === '_popup_') src = new URL(manifest.browser_action!.default_popup!, base).toString()

    if (type === 'b') return { env: Environment.Background }
    if (!src) throw new TypeError('Mocking this kind of page requires a url.')

    if (type === 'p') return { env: Environment.ProtocolPage, href: src }
    else if (type === 'm') return { env: Environment.ContentScript, href: src }
    else {
        throw new TypeError(
            'To debug, ?type= must be one of (b)ackground, (p)rotocol-page (holoflows-extension://.../), (c)ontent-script (used to debug content script), found ' +
                type,
        )
    }
}
