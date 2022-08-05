import { Evaluators } from '@masknet/compartment'
import { clone, CloneKnowledge } from '@masknet/intrinsic-snapshot'
import type { Manifest } from '../../types/extension.js'
import { getExtensionOrigin } from '../utils/url.js'
import { supportLocation_debug } from '../debugger/location.js'
import { isDebugMode } from '../debugger/entry.js'
import { supportWorker_debug } from '../debugger/worker.js'
import { supportObjectURL } from './api/URL.js'
import { supportOpenAndClose } from './api/open-close.js'
import { rejectEvaluator } from './api/evaluator.js'

export class WebExtensionIsolate {
    /**
     * Create an extension environment for an extension.
     * @param extensionID The extension ID.
     * @param manifest The manifest of the extension.
     * @param debugModeLocation The location of the extension, only used in debug mode.
     */
    constructor(public extensionID: string, public manifest: Manifest, debugModeLocation: string) {
        console.log('[WebExtension] Managed Realm created.')

        const knowledge: CloneKnowledge = {
            clonedFromOriginal: new WeakMap(),
            emptyObjectOverride: new WeakMap(),
            descriptorOverride: new WeakMap(),
        }
        if (isDebugMode) {
            supportWorker_debug(extensionID, knowledge)
            if (debugModeLocation) {
                supportLocation_debug(new URL(debugModeLocation, getExtensionOrigin(extensionID)), knowledge)
            }
        }
        supportObjectURL(extensionID, knowledge)
        supportOpenAndClose(extensionID, knowledge)
        rejectEvaluator(knowledge)

        // To be secure, we should pre-clone the globalThis at first, then clone it again for each initialization.
        this.#globalThis = clone(globalThis, knowledge)
        this.#evaluators = new Evaluators({
            globalThis: this.#globalThis,
            // TODO: setup a import hook
        })
        // TODO: define browser and chrome.
        // TODO: define fetch
    }
    #globalThis: typeof globalThis
    #evaluators: Evaluators
}
