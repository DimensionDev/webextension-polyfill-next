import type { CloneKnowledge } from '@masknet/intrinsic-snapshot'
import { encodeStringOrBufferSource } from '../../host/blob.js'

const { createObjectURL, revokeObjectURL } = URL
export function supportObjectURL(extensionID: string, knowledge: CloneKnowledge) {
    knowledge.emptyObjectOverride.set(createObjectURL, createObjectURLHost(extensionID))
    knowledge.emptyObjectOverride.set(revokeObjectURL, revokeObjectURLHost(extensionID))
}

function createObjectURLHost(extensionID: string): (object: any) => string {
    return (obj: File | Blob | MediaSource) => {
        const url = createObjectURL(obj)
        const resourceID = getIDFromBlobURL(url)!
        if (obj instanceof Blob) {
            encodeStringOrBufferSource(obj).then((blob) => {
                // TODO: call host
                // FrameworkRPC['URL.createObjectURL'](extensionID, resourceID, blob)
            })
        }
        return url
    }
}

function revokeObjectURLHost(extensionID: string): (url: string) => void {
    return (url: string) => {
        revokeObjectURL(url)
        const id = getIDFromBlobURL(url)!
        // TODO: call host
        // FrameworkRPC['URL.revokeObjectURL'](extensionID, id)
    }
}
export function getIDFromBlobURL(x: string) {
    if (x.startsWith('blob:')) return new URL(new URL(x).pathname).pathname.replace(/^\//, '')
    return undefined
}
