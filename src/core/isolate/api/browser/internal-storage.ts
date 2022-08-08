import { isDebugMode } from '../../../debugger/enabled.js'
import { FrameworkRPC } from '../../../rpc/framework-rpc.js'
import { reservedID } from '../../runner.js'

export async function getInternalStorage(
    extensionID: string,
    modifier?: (obj: InternalStorage) => void,
): Promise<InternalStorage> {
    if (isDebugMode) {
        const obj = JSON.parse(localStorage.getItem(reservedID + ':' + extensionID) || '{}')
        if (!modifier) return obj
        modifier(obj)
        localStorage.setItem(reservedID + ':' + extensionID, JSON.stringify(obj))
        return obj
    }
    const obj = ((await FrameworkRPC['browser.storage.local.get'](reservedID, extensionID)) as any)[extensionID] || {}
    if (!modifier) return obj
    modifier(obj)
    await FrameworkRPC['browser.storage.local.set'](reservedID, { [extensionID]: obj })
    return obj
}
export interface InternalStorage {
    previousVersion?: string
    dynamicRequestedPermissions?: {
        origins: string[]
        permissions: string[]
    }
    /**
     * This storage is used to emulate `browser.storage.local.*`
     * in localhost debugging
     */
    debugModeStorage?: any
}
