// ## Inject here
import './ses.js'
import { isDebugMode } from './debugger/enabled.js'
import { showDebugEntry } from './debugger/entry-ui.js'
import { registeredWebExtension, registerWebExtension, startWebExtension } from './isolate/runner.js'
import './rpc/debug-rpc.js'

// Note: rollup will keep the comment before the first statement.
//       we expect the framework to insert the following code at "## Inject here":
//           registerWebExtension("your_extension", manifest)

if (isDebugMode) {
    const extensionList = ['test', 'mv3']
    for (const id of extensionList) {
        await fetch('/extension/' + id + '/manifest.json')
            .then((response) => response.json())
            .then((manifest) => registerWebExtension(id, manifest))
            .catch((error) => console.error(`Failed to load extension ${id}`, error))
    }
    if (new URLSearchParams(location.search).get('src')) {
        for (const extension of registeredWebExtension.keys()) {
            startWebExtension(extension)
        }
    } else showDebugEntry()
}

if (!isDebugMode) {
    for (const extension of registeredWebExtension.keys()) {
        startWebExtension(extension)
    }
}
