import { isDebugMode } from './debugger/enabled.js'
import { showDebugEntry } from './debugger/entry-ui.js'
import { registerWebExtension, startWebExtension } from './isolate/runner.js'
import './rpc/debug-rpc.js'

// Register here
registerWebExtension('test', {
    name: 'Test',
    manifest_version: 2,
    background: {
        scripts: [],
    },
})

if (isDebugMode) {
    if (!new URLSearchParams(location.search).get('src')) showDebugEntry()
    else startWebExtension('test')
}
