export class SetSetNumber {
    private internalSet: Set<string>
    
    constructor () {
        this.internalSet = new Set()
    }

    add(value: Set<number>): this {
        this.internalSet.add(encode(value))
        return this
    }

    clear(): this {
        this.internalSet.clear()
        return this
    }

    delete(value: Set<number>): boolean {
        return this.internalSet.delete(encode(value))
    }

    get size(): number {
        return this.internalSet.size
    }

    has(value: Set<number>): boolean {
        return this.internalSet.has(encode(value))
    }

    *[Symbol.iterator](): IterableIterator<Set<number>> {
        for (let encodedString of this.internalSet) {
            yield decode(encodedString)
        }
    }

    forEach(f: (set: Set<number>) => any): void {
        this.internalSet.forEach(encodedString => {
            f(decode(encodedString))
        })
    }
}

function encode(set: Set<number>): string {
    return [...set.values()].sort().join(' ')
}

function decode(string: string): Set<number> {
    return new Set(string.split(' ').map(x => parseInt(x, 10)))
}