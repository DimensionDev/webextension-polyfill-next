export function unreachable(value: never): never {
    throw new TypeError(`Unreachable`)
}
