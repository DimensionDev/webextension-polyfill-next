// ## Inject here
import { isDebugMode } from './debugger/enabled.js'
import { showDebugEntry } from './debugger/entry-ui.js'
import { registeredWebExtension, registerWebExtension, startWebExtension } from './isolate/runner.js'
import './rpc/debug-rpc.js'

// Note: rollup will keep the comment before the first statement.
//       we expect the framework to insert the following code at "## Inject here":
//           registerWebExtension("your_extension", manifest)

if (isDebugMode) {
    if (!new URLSearchParams(location.search).get('src')) showDebugEntry()
    else {
        const extensionList = ['test']
        for (const id of extensionList) {
            await fetch('/extension/' + id + '/manifest.json')
                .then((response) => response.json())
                .then((manifest) => registerWebExtension(id, manifest))
                .catch((error) => console.error(`Failed to load extension ${id}`, error))
        }
    }
}

for (const extension of registeredWebExtension.keys()) {
    startWebExtension(extension)
}
