export interface PromiseCapability<T> {
    Promise: Promise<T>
    Resolve: (value: T | PromiseLike<T>) => void
    Reject: (reason?: any) => void
    Status: 'Resolved' | 'Pending' | 'Rejected'
}
export function NewPromiseCapability<T>(): PromiseCapability<T> {
    let Resolve: (value: T | PromiseLike<T>) => void, Reject: (reason?: any) => void
    const p = new Promise<T>((resolve, reject) => {
        Resolve = resolve
        Reject = reject
    })
    p.then(
        () => (object.Status = 'Resolved'),
        () => (object.Status = 'Rejected'),
    )
    const object: PromiseCapability<T> = {
        Promise: p,
        Resolve: Resolve!,
        Reject: Reject!,
        Status: 'Pending',
    }
    return object
}
