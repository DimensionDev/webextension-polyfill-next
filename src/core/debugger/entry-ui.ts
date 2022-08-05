import type { NormalizedManifest } from '../../types/manifest.js'
import { getRegisteredExtensions } from '../isolate/runner.js'
import { getExtensionOrigin } from '../utils/url.js'

let fCount = 0
const html = String.raw
export function showDebugEntry() {
    const dom = document.createElement('main')
    document.body.appendChild(dom)
    const shadow = dom.attachShadow({ mode: 'open' })
    shadow.innerHTML = html`
        <style>
            * {
                font-family: 'system-ui';
                font-weight: 100;
            }
            a {
                color: black;
            }
            input {
                width: 15em;
            }
        </style>
        <header><h1>WebExtension debugger</h1></header>
        <label>
            <a id="cs" href="/?src=https://">Content Script mocking</a>
            <input id="cs-i" oninput="${handler(() => setURL(a, input))}" type="url" value="https://example.com/" />
        </label>
        <h2>Registered Extensions</h2>
        <ul>
            ${getRegisteredExtensions().map(list)}
        </ul>
    `
    const a = shadow.querySelector('#cs') as any
    const input = shadow.querySelector('#cs-i') as any
    setURL(a, input)
}
function list([id, manifest]: [string, NormalizedManifest]) {
    const backgroundURL =
        `/?src=` +
        encodeURIComponent(
            new URL(
                manifest.background.kind === 'page' ? manifest.background.page : '_generated_background_page.html',
                getExtensionOrigin(id),
            ).toString(),
        )
    return html`<li>
        <h3>${id}</h3>
        <nav>
            <ul>
                <li>
                    <a href="${backgroundURL}">Background</a>
                </li>
                <li>
                    <a id="a-${id}">Protocol page (holoflows-extension://${id}/</a>
                    <input
                        oninput="${handler(function () {
                            setURL(
                                this.parentElement!.querySelector(`#a-${id}`) as any,
                                this as any,
                                `holoflows-extension://${id}/`,
                            )
                        })}" />
                    )
                </li>
            </ul>
        </nav>
    </li>`
}
function handler(f: (this: HTMLElement, event: Event) => void) {
    Reflect.set(globalThis, 'f' + ++fCount, f)
    return `f${fCount}.call(this, event)`
}

function setURL(link: HTMLAnchorElement, element: HTMLInputElement, prefix = '') {
    link.href = `/?src=${encodeURIComponent(prefix + element.value)}`
}
