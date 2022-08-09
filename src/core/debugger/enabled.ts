// this name is used in tree shaking.
const __debug__mode__ = typeof location === 'object' && location.hostname === '127.0.0.1'
export const isDebugMode = __debug__mode__
