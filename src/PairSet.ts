export class PairSet<L, R> {
    private leftToRight: Map<L, Set<R>>
    private rightToLeft: Map<R, Set<L>>

    constructor() {
        this.leftToRight = new Map()
        this.rightToLeft = new Map()
    }

    static of<L, R>(pairs: [L, R][]): PairSet<L, R> {
        let pairSet = new PairSet<L, R>()
        for (let [left, right] of pairs) {
            pairSet.add(left, right)
        }

        return pairSet
    }

    static ofTwoWay<T>(pairs: [T, T][]): PairSet<T, T> {
        let pairSet = new PairSet<T, T>()
        for (let [left, right] of pairs) {
            pairSet.add(left, right)
            pairSet.add(right, left)
        }

        return pairSet
    }

    add(left: L, right: R): void {
        if (!this.leftToRight.has(left)) {
            this.leftToRight.set(left, new Set<R>())
        }

        if (!this.rightToLeft.has(right)) {
            this.rightToLeft.set(right, new Set<L>())
        }

        this.leftToRight.get(left).add(right)
        this.rightToLeft.get(right).add(left)
    }

    getLefts(right: R): Set<L> {
        if (this.rightToLeft.has(right)) {
            return this.rightToLeft.get(right)
        } else {
            return new Set()
        }
    }

    getRights(left: L): Set<R> {
        if (this.leftToRight.has(left)) {
            return this.leftToRight.get(left)
        } else {
            return new Set()
        }
    }

    has(left: L, right: R): boolean {
        if (!this.leftToRight.has(left)) {
            return false
        }

        return this.leftToRight.get(left).has(right)
    }

    toString(): string {
        let result: string[] = []

        for (let [left, rights] of this.leftToRight.entries()) {
            for (let right of rights.values()) {
                result.push(`[${left}, ${right}]`)
            }
        }

        return result.join('\n')
    }
}