/**
 * Internal RPC calls of webextension-shim. Does not related to the native part.
 *
 * This channel is used as internal RPCs.
 * Use Host.onMessage and Host.sendMessage as channel.
 */
import type { NormalizedManifest } from './manifest.js'
/**
 * Every method of InternalRPCMethods must start with parameter 0 as `targetTabID: number`
 */
export interface InternalRPCMethods {
    /**
     * Should inject the given script into the given tabID
     * @param tabID - inject to which tab
     * @param extensionID - the extension id
     * @param manifest - the manifest
     * @param details - See https://mdn.io/browser.tabs.executeScript
     */
    executeContentScript(
        tabID: number,
        extensionID: string,
        manifest: NormalizedManifest,
        details: {
            code?: string
            file?: string
            runAt?: 'document_start' | 'document_end' | 'document_idle'
        },
    ): Promise<unknown>
}
