export interface PromiseCapability<T> {
    Promise: Promise<T>
    Resolve: (value: T | PromiseLike<T>) => void
    Reject: (reason?: any) => void
}
export function NewPromiseCapability<T>(): PromiseCapability<T> {
    let Resolve: (value: T | PromiseLike<T>) => void, Reject: (reason?: any) => void
    const p = new Promise<T>((resolve, reject) => {
        Resolve = resolve
        Reject = reject
    })
    return {
        Promise: p,
        Resolve: Resolve!,
        Reject: Reject!,
    }
}
