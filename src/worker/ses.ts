/// <reference path="../../node_modules/ses/index.d.ts" />
import { isDebugMode } from '../core/debugger/enabled.js'

if (isDebugMode) {
    // @ts-expect-error
    await import('../../node_modules/ses/dist/lockdown.mjs')
} else {
    importScripts('/_ses_.js')
}

lockdown({
    errorTaming: 'unsafe',
    consoleTaming: 'unsafe',
})
