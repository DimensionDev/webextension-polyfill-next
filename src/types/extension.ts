export type Manifest = Partial<browser.runtime.Manifest> &
    Pick<browser.runtime.Manifest, 'name' | 'version' | 'manifest_version'>
