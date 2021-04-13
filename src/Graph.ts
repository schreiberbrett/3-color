import { Pair } from "./Pair";
import { PairSet } from "./PairSet";

export class Graph {
    private numberOfVertices: number
    private edgeSet: PairSet<number, number>
    private edgeList: Pair<number, number>[]

    constructor(numberOfVertices: number) {
        this.numberOfVertices = numberOfVertices
        this.edgeList = []
        this.edgeSet = new PairSet()
    }

    size(): number {
        return this.numberOfVertices
    }

    hasEdge(u: number, v: number): boolean {
        return this.edgeSet.has(u, v)
    }

    addEdge(u: number, v: number): void {
        if (!this.hasEdge(u, v)) {
            this.edgeSet.add(u, v)
            this.edgeSet.add(v, u)
            this.edgeList.push(Pair.of(Math.min(u, v), Math.max(u, v)))
        }
    }

    edges(): Pair<number, number>[] {
        return this.edgeList
    }

    neighbors(u: number): Set<number> {
        return this.edgeSet.getLefts(u)
    }
}