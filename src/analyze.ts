import { Graph } from "./Graph"

export function asGraph(numberOfVertices: number, edges: [number, number][]): Graph {
    let graph = new Graph(numberOfVertices)
    
    for (let [u, v] of edges) {
        graph.addEdge(u, v)
    }

    return graph
}

export function findCycles(graph: Graph, cycleLength: number): number[][] {
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

export function range(n: number): number[] {
    let result: number[] = []

    for (let i = 0; i < n; i++) {
        result.push(i)
    }

    return result
}
