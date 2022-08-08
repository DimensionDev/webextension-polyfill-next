import { AsyncCall } from 'async-call-rpc'
import type { InternalRPCMethods } from '../../types/internal-rpc.js'
import {
    registeredWebExtension,
    registerWebExtension,
    startedWebExtension,
    startWebExtension,
} from '../isolate/runner.js'
import { getExtensionOrigin } from '../utils/url.js'
import { internalRPCChannel } from './internal-channel.js'

const internalRPCLocalImplementation: InternalRPCMethods = {
    async executeContentScript(targetTabID, extensionID, manifest, options) {
        console.debug('[WebExtension] requested to inject code', options)
        if (!registeredWebExtension.has(extensionID)) registerWebExtension(extensionID, manifest.rawManifest)
        if (!startedWebExtension.has(extensionID)) await startWebExtension(extensionID)

        const isolate = startedWebExtension.get(extensionID)!

        if (options.code) throw new EvalError('Refuse to compile string into JavaScript.')
        else if (options.file) {
            // TODO: check the permission to inject the script
            isolate.import(new URL(options.file, getExtensionOrigin(extensionID)).toString())
        }
    },
}

export const internalRPC = AsyncCall<InternalRPCMethods>(internalRPCLocalImplementation, {
    log: false,
    channel: internalRPCChannel,
    strict: false,
})
