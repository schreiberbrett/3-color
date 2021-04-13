export type Maybe<T> = {
    kind: 'Nothing'
} | {
    kind: 'Just',
    value: T
}

export function Nothing<T>(): Maybe<T> {
    return {kind: 'Nothing'}
}

export function Just<T>(value: T): Maybe<T> {
    return {kind: 'Just', value: value}
}

export function isJust<T>(maybe: Maybe<T>): maybe is {kind: 'Just', value: T} {
    return (maybe.kind === 'Just')
}

export function justs<T>(maybes: Maybe<T>[]): T[] {
    let result = []
    for (let maybe of maybes) {
        if (isJust(maybe)) {
            result.push(maybe.value)
        }
    }

    return result
}

export function maximum(xs: number[]): Maybe<number> {
    let result = Nothing<number>()

    for (let x of xs) {
        if (isJust(result)) {
            result = Just(Math.max(result.value, x))
        } else {
            result = Just(x)
        }
    }

    return result
}