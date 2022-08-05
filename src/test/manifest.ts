import { it, expect } from 'vitest'
import { from_v2, from_v3 } from '../types/manifest.js'

it('should parse manifest v2', () => {
    const parsed = from_v2(mv2)
    if (parsed) Reflect.deleteProperty(parsed, 'rawManifest')
    expect(parsed).toMatchInlineSnapshot(`
      {
        "background": {
          "kind": "page",
          "page": "background.html",
        },
        "manifest_version": 2,
        "name": "Mask Network",
        "optional_permissions": [
          "<all_urls>",
          "notifications",
          "clipboardRead",
        ],
        "permissions": [
          "storage",
          "downloads",
          "webNavigation",
          "activeTab",
        ],
      }
    `)
})

it('should parse manifest v3', () => {
    const parsed = from_v3(mv3)
    if (parsed) Reflect.deleteProperty(parsed, 'rawManifest')
    expect(parsed).toMatchInlineSnapshot(`
      {
        "background": {
          "kind": "worker",
          "worker": "/manifest-v3.entry.js",
        },
        "manifest_version": 3,
        "name": "Mask Network",
        "optional_permissions": [
          "notifications",
          "clipboardRead",
        ],
        "permissions": [
          "storage",
          "downloads",
          "webNavigation",
          "activeTab",
          "scripting",
        ],
      }
    `)
})

const mv2 = {
    name: 'Mask Network',
    version: '2.10.0',
    manifest_version: 2,
    permissions: ['storage', 'downloads', 'webNavigation', 'activeTab'],
    optional_permissions: ['<all_urls>', 'notifications', 'clipboardRead'],
    background: { page: 'background.html' },
    options_ui: { page: 'dashboard.html', open_in_tab: true },
    icons: { '16': '16x16.png', '48': '48x48.png', '128': '128x128.png', '256': '256x256.png' },
    browser_action: { default_popup: 'popups.html' },
    homepage_url: 'https://mask.io',
    description:
        'The portal to the new & open Internet. Send encrypted message and decentralized Apps right on top of social networks.',
    web_accessible_resources: ['js/*', '*.svg', '*.png', '*.css'],
    content_security_policy: "script-src 'self' 'wasm-eval'; object-src 'self';",
}

const mv3 = {
    name: 'Mask Network',
    version: '2.7.0',
    manifest_version: 3,
    permissions: ['storage', 'downloads', 'webNavigation', 'activeTab', 'scripting'],
    optional_permissions: ['notifications', 'clipboardRead'],
    optional_host_permissions: ['<all_urls>'],
    background: { service_worker: '/manifest-v3.entry.js' },
    options_ui: { page: 'dashboard.html', open_in_tab: true },
    icons: { '16': '16x16.png', '48': '48x48.png', '128': '128x128.png', '256': '256x256.png' },
    action: { default_popup: 'popups.html' },
    homepage_url: 'https://mask.io',
    description:
        'The portal to the new & open Internet. Send encrypted message and decentralized Apps right on top of social networks.',
    web_accessible_resources: [
        {
            resources: ['js/*', '*.svg', '*.png', '*.css'],
            matches: ['<all_urls>'],
            use_dynamic_url: true,
        },
        {
            resources: ['hot/*'],
            matches: ['<all_urls>'],
            use_dynamic_url: false,
        },
    ],
    content_security_policy: {
        extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
    minimum_chrome_version: '102',
}
