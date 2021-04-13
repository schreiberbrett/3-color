import { Graph } from "./Graph"
import { isJust, Just, Maybe, Nothing } from "./Maybe"
import type { Pair } from "./Pair"
import { PairSet } from "./PairSet"
import type { SetSetNumber } from "./SetSetNumber"

export type Analysis = {
    kind: 'Contains Known Subgraph'
    subgraph: Diamond | QE8
} | {
    kind: 'Mundane'
} | {
    kind: 'Contains Isochromacy or Quasi Edges'
} | {
    kind: 'Not 3 Colorable'
}

export type Diamond = {
    kind: 'Diamond'
    edges: PairSet<number, number>
    top: number
    bottom: number
    left: number
    right: number
}

function findDiamond(graph: Graph): Maybe<Diamond> {
    let edges = graph.edges()

    for (let edge of edges) {
        const u = edge.left()
        const v = edge.right()

        // Find two vertices common to both u and v
        for (let i = 0; i < graph.size(); i++) {
            for (let j = 0; j < graph.size(); j++) {
                if (
                    i !== j &&
                    graph.hasEdge(u, i) &&
                    graph.hasEdge(v, i) &&
                    graph.hasEdge(u, j) &&
                    graph.hasEdge(v, j)
                ) {
                    return Just({
                        kind: 'Diamond',
                        top: i,
                        bottom: j,
                        left: u,
                        right: v,
                        edges: PairSet.ofTwoWay([
                            [i, u],
                            [i, v],
                            [u, j],
                            [v, j],
                            [u, v]
                        ])
                    })
                }
            }
        }
    }

    return Nothing()
}

export type QE8 = {
    kind: 'QE8'
    edges: PairSet<number, number>

    hornL: number
    hornR: number

    topL: number
    topM: number
    topR: number

    botL: number
    botM: number
    botR: number
}

export type TwoCoveringOddCycle = {
    kind: 'TwoCoveringOddCycle'
    oddCycleVertices: Set<number>
    oddCycleEdges: PairSet<number, number>

    coveringVertexA: number
    coveringVertexB: number
    coveringVertexEdges: PairSet<number, number>
}


function findQE8(graph: Graph): Maybe<QE8> {
    const cycles = findCycles(graph, 8)

    for (let cycle of cycles) {
        const [hornL, topL, topM, topR, hornR, botR, botM, botL] = cycle
        if (
            graph.hasEdge(topL, topR) &&

            graph.hasEdge(topL, botL) &&
            graph.hasEdge(topM, botM) &&
            graph.hasEdge(topR, botR)
        ) {
            return Just({
                kind: 'QE8',
                hornL, topL, topM, topR, hornR, botR, botM, botL,
                edges: PairSet.ofTwoWay([
                    ...cycleEdgePairs(cycle),
                    [topL, topR],

                    [topL, botL],
                    [topM, botM],
                    [topR, botR]
                ])
            })
        }
    }

    return Nothing()
}

function findTwoCoveringOddCycle(graph: Graph): Maybe<TwoCoveringOddCycle> {
    for (let cycleLength = 5; cycleLength <= (graph.size() - 2); cycleLength += 2) {
        const cycles = findCycles(graph, cycleLength)

        for (let cycle of cycles) {
            for (let i = 0; i < graph.size(); i++) {
                if (!cycle.includes(i)) {
                    for (let j = 0; j < i; j++) {
                        if (!cycle.includes(j)) {
                            if (cycle.every(vertex => graph.hasEdge(vertex, i) || graph.hasEdge(vertex, j))) {
                                const iCovers = graph.edges().filter(pair => null)
                                const jCovers = null

                                return Just({
                                    kind: 'TwoCoveringOddCycle',
                                    coveringVertexA: i,
                                    coveringVertexB: j,
                                    coveringVertexEdges: PairSet.ofTwoWay(
                                        []
                                    ),
                                    oddCycleEdges: null,
                                    oddCycleVertices: null
                                })
                            }
                        }
                    }
                }
            }
        }
    }

    return Nothing()
}

function cycleEdgePairs(cycle: number[]): [number, number][] {
    let pairs: [number, number][] = []
    for (let i = 0; i < cycle.length - 1; i++) {
        pairs.push([cycle[i], cycle[i + 1]])
    }

    pairs.push([cycle[0], cycle[cycle.length - 1]])

    return pairs
}

export function asGraph(numberOfVertices: number, edges: [number, number][]): Graph {
    let graph = new Graph(numberOfVertices)
    
    for (let [u, v] of edges) {
        graph.addEdge(u, v)
    }

    return graph
}

export function analyze(graph: Graph): Analysis {
    const maybeDiamond = findDiamond(graph)

    if (isJust(maybeDiamond)) {
        return {
            kind: 'Contains Known Subgraph',
            subgraph: maybeDiamond.value
        }
    }

    const maybeQE8 = findQE8(graph)
    if (isJust(maybeQE8)) {
        return {
            kind: 'Contains Known Subgraph',
            subgraph: maybeQE8.value
        }
    }

    return {
        kind: 'Mundane'
    }
}

function findCycles(graph: Graph, cycleLength: number): number[][] {
    return findPaths(graph, cycleLength)
        .filter(path => graph.hasEdge(path[0], path[cycleLength - 1]))
}

function findPaths(graph: Graph, pathLength: number): number[][] {
    return flatMap(range(graph.size()), vertex => helper([], vertex))

    function helper(pathSoFar: number[], lastInPath: number): number[][] {
        const fullPath = [...pathSoFar, lastInPath]

        if (fullPath.length === pathLength) {
            return [fullPath]
        }

        const candidateVertices = range(graph.size()).filter(vertex => !pathSoFar.includes(vertex) && graph.hasEdge(lastInPath, vertex))

        if (candidateVertices.length === 0) {
            return []
        }

        return flatMap(candidateVertices, vertex => helper(fullPath, vertex))
    }
}

function flatMap<A, B>(xs: A[], f: (a: A) => B[]): B[] {
    let result: B[] = []
    for (let x of xs) {
        result.push(...f(x))
    }

    return result
}

function range(n: number): number[] {
    let result: number[] = []

    for (let i = 0; i < n; i++) {
        result.push(i)
    }

    return result
}

type OddCycle = {
    kind: 'OddCycle'
    edges: PairSet<number, number>
    result: Set<number>
}

type Smaller3 = {
    kind: 'Smaller3'
    a: ProofOf3
    b: ProofOf3
    c: Either<ProofOfNot1, ProofOf3>
    // red
    // blue
    // purple (shared)
    // green
    result: Set<number>
}


type SingleVertex = {
    kind: 'SingleVertex'
    vertex: number
    result: Set<number>
}

type FullCover = {
    kind: 'FullCover'
    notOneProof: Either<ProofOfNot1, ProofOf3>
    edges: PairSet<number, number>
    result: Set<number>
}

type ProofOf3 = OddCycle | Smaller3
type ProofOf1 = SingleVertex | FullCover

type ProofOfNot3 = LessThan3Vertices | Neighbors3OrMore

type LessThan3Vertices = {
    kind: 'LessThan3Vertices'
    result: Set<number>
}

type Neighbors3OrMore = {
    kind: 'Neighbors3OrMore'
    vertex: number
    edges: PairSet<number, number>
    result: Set<number>
}

type ProofOfNot1 = {
    kind: 'Edge'
    edge: Pair<number, number>
    result: Set<number>
} | {
    kind: 'SomeCover'
    proofOf3: ProofOf3
    vertices3: Set<number>
    result: Set<number>
}

type ProofOfNon3Colorability = Contradiction1 | Contradiction3 | Contradiction1and3

type Contradiction1 = {
    kind: 'Contradiction1'
    proofOfNot1: ProofOfNot1,
    proofOf1: ProofOf1
}

type Contradiction3 = {
    kind: 'Contradiction3'
    proofOfNot3: ProofOfNot3,
    proofOf3: ProofOf3
}

type Contradiction1and3 = {
    kind: 'Contradiction1and3'
    proofOf1: ProofOf1,
    proofOf3: ProofOf3
}

type Either<L, R> = {
    kind: 'Left'
    value: L
} | {
    kind: 'Right'
    value: R
}

function newAnalyze(graph: Graph): ProofOfNon3Colorability {
    let proofList = []

    return null
}


function* oddCycles(graph: Graph): IterableIterator<OddCycle> {
    for (let cycleLength = 3; cycleLength <= graph.size(); cycleLength += 2) {
        for (let cycle of findCycles(graph, cycleLength)) {
            yield {
                kind: 'OddCycle',
                edges: PairSet.ofTwoWay(cycleEdgePairs(cycle)),
                result: new Set(cycle)
            }
        }
    }
}
