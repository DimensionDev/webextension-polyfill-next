import type { CloneKnowledge } from '@masknet/intrinsic-snapshot'
import { encodeStringOrBufferSource } from '../../host/blob.js'
import { FrameworkRPC } from '../../rpc/framework-rpc.js'

const { createObjectURL, revokeObjectURL } = URL
export function supportObjectURL(extensionID: string, global: typeof globalThis) {
    const create = createObjectURLHost(extensionID)
    const revoke = revokeObjectURLHost(extensionID)
    global.URL.createObjectURL = create
    global.URL.revokeObjectURL = revoke
}
export function supportObjectURL_debug(extensionID: string, knowledge: CloneKnowledge) {
    knowledge.emptyObjectOverride.set(createObjectURL, createObjectURLHost(extensionID))
    knowledge.emptyObjectOverride.set(revokeObjectURL, revokeObjectURLHost(extensionID))
}

function createObjectURLHost(extensionID: string): (object: any) => string {
    return (obj: File | Blob | MediaSource) => {
        const url = createObjectURL(obj)
        const resourceID = getIDFromBlobURL(url)!
        if (obj instanceof Blob) {
            encodeStringOrBufferSource(obj).then((blob) => {
                FrameworkRPC['URL.createObjectURL'](extensionID, resourceID, blob)
            })
        }
        return url
    }
}

function revokeObjectURLHost(extensionID: string): (url: string) => void {
    return (url: string) => {
        revokeObjectURL(url)
        const id = getIDFromBlobURL(url)!
        FrameworkRPC['URL.revokeObjectURL'](extensionID, id)
    }
}
export function getIDFromBlobURL(x: string) {
    if (x.startsWith('blob:')) return new URL(new URL(x).pathname).pathname.replace(/^\//, '')
    return undefined
}
