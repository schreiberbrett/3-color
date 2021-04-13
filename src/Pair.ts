export class Pair<L, R> {
    private _left: L
    private _right: R

    constructor(left: L, right: R) {
        this._left = left
        this._right = right
    }

    static of<L, R>(left: L, right: R): Pair<L, R> {
        return new Pair(left, right)
    }

    left(): L {
        return this._left
    }

    right(): R {
        return this._right
    }
}