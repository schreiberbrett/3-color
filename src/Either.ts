export type Either<A, B> = {
    kind: 'Left'
    left: A
} | {
    kind: 'Right'
    right: B
}

export function Left<A, B>(left: A): Either<A, B> {
    return {kind: 'Left', left}
}

export function Right<A, B>(right: B): Either<A, B> {
    return {kind: 'Right', right}
}