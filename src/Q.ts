import { Set, List, Record, RecordOf, Map } from 'immutable'
import { findCycles } from './analyze'
import { nonemptySubsets } from './coloring'
import type { Graph } from './Graph'

export type OddCycle = {
    vertices: Set<number>
    cycle: number[]
}

export type Q = {
    cycleEdges: Set<Edge>
    completeBipartiteSubgraphEdges: Set<Edge>
    cycleVertices: Set<number>
    completeBipartiteSubgraphVertices: Set<number>
    oddCycles: List<OddCycle>
    oddCycleSet: Set<Set<number>>
    zeta3Vertices: Set<number>
}

type Edge = RecordOf<{u: number, v: number}>

export const makeEdge: Record.Factory<{u: number, v: number}> = Record({u: 0, v: 0})

export function generateQs(graph: Graph, oddCycles: OddCycle[]): Q[] {
    let qArray: Q[] = oddCycles.map(asSingletonQ)
    let alreadyFound = Set(oddCycles.map(oddCycle => oddCycle.vertices))

    let total = qArray
    let current = qArray

    while (current.length !== 0) {
        let next: Q[] = []

        for (let q of current) {
            for (let oddCycle of oddCycles) {
                for (let newQ of allQs(graph, q, oddCycle)) {
                    if (!alreadyFound.has(newQ.zeta3Vertices)) {
                        next.push(newQ)
                        total.push(newQ)
                        alreadyFound = alreadyFound.add(newQ.zeta3Vertices)
                    }
                }
            }
        }
        current = next
    }

    return total

    let qArray2: Q[] = []
    for (let q of qArray) {
        for (let oddCycle of oddCycles) {
            for (let newQ of allQs(graph, q, oddCycle)) {
                if (!alreadyFound.has(newQ.zeta3Vertices)) {
                    console.log('got in qarray2')
                    qArray2.push(newQ)
                    alreadyFound = alreadyFound.add(newQ.zeta3Vertices)
                }
            }
        }
    }

    if (qArray2.length === 0) {

    }

    let qArray3: Q[] = []
    for (let q of qArray2) {
        for (let oddCycle of oddCycles) {
            for (let newQ of allQs(graph, q, oddCycle)) {
                if (!alreadyFound.has(newQ.zeta3Vertices)) {
                    console.log('got in qarray3')
                    qArray3.push(newQ)
                    alreadyFound = alreadyFound.add(newQ.zeta3Vertices)
                }
            }
        }
    }

    let qArray4: Q[] = []
    for (let q of qArray3) {
        for (let oddCycle of oddCycles) {
            for (let newQ of allQs(graph, q, oddCycle)) {
                if (!alreadyFound.has(newQ.zeta3Vertices)) {
                    console.log('got in qarray4')
                    qArray4.push(newQ)
                    alreadyFound = alreadyFound.add(newQ.zeta3Vertices)
                }
            }
        }
    }

    let qArray5: Q[] = []
    for (let q of qArray4) {
        for (let oddCycle of oddCycles) {
            for (let newQ of allQs(graph, q, oddCycle)) {
                if (!alreadyFound.has(newQ.zeta3Vertices)) {
                    console.log('got in qarray5')
                    qArray5.push(newQ)
                    alreadyFound = alreadyFound.add(newQ.zeta3Vertices)
                }
            }
        }
    }

    let qArray6: Q[] = []
    for (let q of qArray5) {
        for (let oddCycle of oddCycles) {
            for (let newQ of allQs(graph, q, oddCycle)) {
                if (!alreadyFound.has(newQ.zeta3Vertices)) {
                    console.log('got in qarray6')
                    qArray6.push(newQ)
                    alreadyFound = alreadyFound.add(newQ.zeta3Vertices)
                }
            }
        }
    }


    return [...qArray, ...qArray2, ...qArray3, ...qArray4, ...qArray5, ...qArray6]
}

function allQs(graph: Graph, q: Q, oddCycle: OddCycle): Q[] {
    if (q.oddCycleSet.has(oddCycle.vertices)) {
        return []
    }

    let edges = new Array<Edge>()

    for (let u of q.zeta3Vertices) {
        for (let v of oddCycle.vertices) {
            if (graph.hasEdge(u, v) && !oddCycle.vertices.has(u) && !q.zeta3Vertices.has(v)) {
                edges.push(makeEdge({u, v}))
            }
        }
    }

    const edgeSubsets = nonemptySubsets(edges)

    let result = new Array<Q>()
    for (let edgeSubset of edgeSubsets) {
        if (isCompleteBipartite(graph, edgeSubset)) {
            result.push(asQ(q, oddCycle, edgeSubset))
        }
    }

    return result
}

function asQ(q: Q, oddCycle: OddCycle, i1i2: Edge[]): Q {
    let i1i2VerticesWithDuplicates = new Array<number>()
    
    for (let {u, v} of i1i2) {
        i1i2VerticesWithDuplicates.push(u)
        i1i2VerticesWithDuplicates.push(v)
    }

    const i1i2Vertices = Set.of(...i1i2VerticesWithDuplicates)

    return {
        cycleEdges: makeCycleEdges(oddCycle).concat(q.cycleEdges),
        completeBipartiteSubgraphEdges: q.completeBipartiteSubgraphEdges.concat(i1i2),
        cycleVertices: q.cycleVertices.concat(oddCycle.vertices),
        completeBipartiteSubgraphVertices: q.completeBipartiteSubgraphVertices.concat(i1i2Vertices),
        oddCycles: q.oddCycles.push(oddCycle),
        oddCycleSet: q.oddCycleSet.add(oddCycle.vertices),
        zeta3Vertices: oddCycle.vertices.concat(q.zeta3Vertices).filterNot(vertex => i1i2Vertices.has(vertex))
    }
}

function makeCycleEdges(oddCycle: OddCycle): Set<Edge> {
    let cycleEdgeList: Edge[] = []
    for (let i = 0; i < oddCycle.cycle.length - 1; i++) {
        cycleEdgeList.push(makeEdge({u: oddCycle.cycle[i], v: oddCycle.cycle[i + 1]}))
    }

    cycleEdgeList.push(makeEdge({u: oddCycle.cycle[0], v: oddCycle.cycle[oddCycle.cycle.length - 1]}))

    return Set.of(...cycleEdgeList)
}

export function qVertexColor(vertex: number, q: Q): 'gray' | 'white' {
    return q.zeta3Vertices.has(vertex) ? 'gray' : 'white'
}

export function qMentionedEdge(u: number, v: number, q: Q): boolean {
    return q.cycleEdges.has(makeEdge({u: u, v: v})) || q.cycleEdges.has(makeEdge(({u: v, v: u})))
}

function isCompleteBipartite(graph: Graph, edges: Edge[]): boolean {
    let us = new Array<number>()
    let vs = new Array<number>()
    
    for (let {u, v} of edges) {
        us.push(u)
        vs.push(v)
    }
    
    for (let u of us) {
        for (let v of vs) {
            if (!graph.hasEdge(u, v)) {
                return false
            }
        }   
    }

    return true
}

function asSingletonQ(oddCycle: OddCycle): Q {
    return {
        zeta3Vertices: oddCycle.vertices,
        cycleVertices: oddCycle.vertices,
        cycleEdges: makeCycleEdges(oddCycle),
        oddCycles: List.of(oddCycle),
        oddCycleSet: Set.of(oddCycle.vertices),
        completeBipartiteSubgraphEdges: Set(),
        completeBipartiteSubgraphVertices: Set()
    }
}

export function allOddCycles(graph: Graph): OddCycle[] {
    let alreadyFound = Set<Set<number>>()
    let result = new Array<OddCycle>()

    for (let cycleLength = 3; cycleLength <= graph.size(); cycleLength += 2) {
        for (let cycle of findCycles(graph, cycleLength)) {
            const set = Set.of(...cycle)

            if (!alreadyFound.has(set)) {
                alreadyFound = alreadyFound.add(set)
                result.push({cycle, vertices: set})
            }
        }
    }

    return result
}
