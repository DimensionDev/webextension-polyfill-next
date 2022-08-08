export interface NormalizedManifest {
    manifest_version: 2 | 3
    name: string
    permissions: string[]
    optional_permissions: string[]
    host_permissions: string[]
    optional_host_permissions: string[]
    background: Background
    rawManifest: object
}
export type Background = BackgroundPage | BackgroundScripts | BackgroundWorker
export interface BackgroundPage {
    kind: 'page'
    page: string
}
export interface BackgroundScripts {
    kind: 'scripts'
    scripts: string[]
}
export interface BackgroundWorker {
    kind: 'worker'
    worker: string
}

/**
 * Parse a NormalizedManifest from a Manifest V2 JSON.
 * @param manifest A manifest v2 object
 * @returns The normalized manifest
 */
export function from_v2(manifest: unknown): NormalizedManifest | null {
    manifest = JSON.parse(JSON.stringify(manifest))
    if (!isObject(manifest)) return null
    if (!has(manifest, 'manifest_version') || manifest.manifest_version !== 2) return null

    const normalized: Partial<NormalizedManifest> = {
        manifest_version: 2,
        rawManifest: manifest,
    }
    if (!parseName(manifest, normalized)) return null
    if (!parsePermissions(manifest, normalized, true)) return null
    if (!parseBackground(manifest, normalized)) return null
    return normalized as NormalizedManifest
}

/**
 * Parse a NormalizedManifest from a Manifest V3 JSON.
 * @param manifest A manifest v3 object
 * @returns The normalized manifest
 */
export function from_v3(manifest: unknown): NormalizedManifest | null {
    manifest = JSON.parse(JSON.stringify(manifest))
    if (!isObject(manifest)) return null
    if (!has(manifest, 'manifest_version') || manifest.manifest_version !== 3) return null

    const normalized: Partial<NormalizedManifest> = {
        manifest_version: 3,
        rawManifest: manifest,
    }
    if (!parseName(manifest, normalized)) return null
    if (!parsePermissions(manifest, normalized, false)) return null
    if (!parseBackground(manifest, normalized)) return null
    if (normalized.background && normalized.background.kind !== 'worker') return null
    return normalized as NormalizedManifest
}

function parseName(manifest: object, normalized: Partial<NormalizedManifest>) {
    if (!has(manifest, 'name') || !isString(manifest.name)) return false
    normalized.name = manifest.name
    return true
}
function parsePermissions(manifest: object, normalized: Partial<NormalizedManifest>, separateHostPermission: boolean) {
    // TODO: move host permissions out
    if (has(manifest, 'permissions')) {
        if (!Array.isArray(manifest.permissions)) return false
        if (!manifest.permissions.every(isString)) return false
        normalized.permissions = manifest.permissions as string[]
    }

    if (has(manifest, 'optional_permissions')) {
        if (!Array.isArray(manifest.optional_permissions)) return false
        if (!manifest.optional_permissions.every(isString)) return false
        normalized.optional_permissions = manifest.optional_permissions as string[]
    }
    return true
}
function parseBackground(manifest: object, normalized: Partial<NormalizedManifest>) {
    if (has(manifest, 'background')) {
        if (!isObject(manifest.background)) return false
        if (has(manifest.background, 'service_worker')) {
            if (!isString(manifest.background.service_worker)) return false
            normalized.background = {
                kind: 'worker',
                worker: manifest.background.service_worker,
            }
        }
        if (has(manifest.background, 'page')) {
            if (normalized.background) return false
            if (!isString(manifest.background.page)) return false
            normalized.background = {
                kind: 'page',
                page: manifest.background.page,
            }
        }
        if (has(manifest.background, 'scripts')) {
            if (normalized.background) return false
            if (!Array.isArray(manifest.background.scripts)) return false
            if (!manifest.background.scripts.every(isString)) return false
            normalized.background = {
                kind: 'scripts',
                scripts: manifest.background.scripts,
            }
        }
    } else {
        normalized.background = {
            kind: 'scripts',
            scripts: [],
        }
    }
    return true
}

function isObject(value: unknown): value is object {
    return typeof value === 'object' && value !== null
}
const has: <T extends object, K extends PropertyKey>(o: T, key: K) => o is T & { [key in K]: unknown } =
    Object.hasOwn as any
function isString(value: unknown): value is string {
    return typeof value === 'string'
}
