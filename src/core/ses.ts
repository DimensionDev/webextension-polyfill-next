/// <reference path="../../node_modules/ses/index.d.ts" />
import '../../node_modules/ses/dist/lockdown.mjs'
lockdown({
    errorTaming: 'unsafe',
    consoleTaming: 'unsafe',
})
