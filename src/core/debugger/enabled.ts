export const isDebugMode = typeof location === 'object' && location.hostname === '127.0.0.1'
if (typeof location === 'object' && location.hostname === 'localhost') {
    location.hostname = '127.0.0.1'
}
