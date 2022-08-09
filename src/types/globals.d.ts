declare var webkit: undefined | WebkitAPI
interface WebkitAPI {
    messageHandlers?: Record<string, WebkitMessageHandler>
}
interface WebkitMessageHandler {
    postMessage(data: unknown): void
}
declare function importScripts(...args: (string | URL)[]): void
