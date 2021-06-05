import { range, findCycles } from "./analyze";
import type { Graph } from "./Graph";
import { isJust, Just, justs, Maybe, Nothing } from "./Maybe";
import { PairSet } from "./PairSet";
import { elementOf, merge, mergeUnique, SortedNumbers, sortedUniques } from "./SortedNumbers";
import * as Immutable from 'immutable'

export type Color = 'Red' | 'Green' | 'Blue'


export function computeColorings(graph: Graph): Color[][] {
    return helper(graph, 0, range(graph.size()).map(_ => Nothing()))
}

function helper(graph: Graph, currentVertex: number, colors: Maybe<Color>[]): Color[][] {
    if (currentVertex === graph.size()) {
        return [justs(colors)]
    }

    const neighbors = graph.neighbors(currentVertex)
    let hasRedNeighbor = false
    let hasGreenNeighbor = false
    let hasBlueNeighbor = false

    for (let vertex of neighbors.values()) {
        const coloring = colors[vertex]
        if (isJust(coloring)) {
            switch (coloring.value) {
                case 'Red':
                    hasRedNeighbor = true
                    break
                case 'Green':
                    hasGreenNeighbor = true
                    break
                case 'Blue':
                    hasBlueNeighbor = true
                    break
            }
        }
    }

    const asRed = hasRedNeighbor ? [] :
        helper(graph, currentVertex + 1, withInserted(colors, currentVertex, 'Red'))

    const asGreen = hasGreenNeighbor ? [] :
        helper(graph, currentVertex + 1, withInserted(colors, currentVertex, 'Green'))

    const asBlue = hasBlueNeighbor ? [] :
        helper(graph, currentVertex + 1, withInserted(colors, currentVertex, 'Blue'))

    return [...asRed, ...asGreen, ...asBlue]
}

function withInserted<T>(xs: Maybe<T>[], index: number, value: T): Maybe<T>[] {
    let result = []
    for (let i = 0; i < xs.length; i++) {
        if (i === index) {
            result[i] = Just(value)
        } else {
            result[i] = xs[i]
        }
    }

    return result
}

export type SubsetColors = {
    canBeOneColor: boolean,
    canBeTwoColors: boolean,
    canBeThreeColors: boolean
}

export type Constraints = {
    isochromacyPairs: PairSet<number, number>
    quasiEdges: PairSet<number, number>
}

export function findConstraints(graph: Graph, colorings: Color[][]): Constraints {
    let isochromacyPairs = generateAllUniquePairs(graph.size())
    let quasiEdges = generateAllUniquePairs(graph.size())

    for (let coloring of colorings) {
        isochromacyPairs = isochromacyPairs.filter(([u, v]) => coloring[u] === coloring[v])
        quasiEdges = quasiEdges.filter(([u, v]) => coloring[u] !== coloring[v])
    }

    return {
        isochromacyPairs: PairSet.ofTwoWay(isochromacyPairs),
        quasiEdges: PairSet.ofTwoWay(quasiEdges)
    }
}

export function whatColors(graph: Graph, colorings: Color[][]): {subset: number[], subsetColors: SubsetColors}[] {
    const numberOfVertices = colorings[0].length
    const subsets = getSubsets(numberOfVertices)
    const oddCycles = [] // allOddCycles(graph)

    return subsets
        .filter(subset => {
            if (subset.length < 2) {
                return false
            }

            if (subset.length === 2 && graph.hasEdge(subset[0], subset[1])) {
                return false
            }

            // Subsets containing odd cycles are not interesting
            if (oddCycles.some(oddCycle => contains(subset, oddCycle))) {
                return false
            }            

            return true
        })
        .map(subset => ({
            subset,
            subsetColors: subsetColors(subset, colorings)
        }))
        .filter(result => {

            // 1 or 2 is not interesting in a subset of size 2
            if (result.subset.length === 2 && result.subsetColors.canBeOneColor && result.subsetColors.canBeTwoColors) {
                return false
            }

            // 2 or 3 is not interesting when the subset contains an edge
            if (result.subsetColors.canBeTwoColors && result.subsetColors.canBeThreeColors) {
                for (let i = 0; i < result.subset.length; i++) {
                    for (let j = 0; j < i; j++) {
                        if (graph.hasEdge(result.subset[i], result.subset[j])) {
                            return false
                        }
                    }
                }
            }

            // 1 or 2 or 3 is not interesting when the subset does NOT contain an edge
            if (result.subsetColors.canBeOneColor && result.subsetColors.canBeTwoColors && result.subsetColors.canBeThreeColors) {
                let hasAtLeastOneEdge = false


                for (let i = 0; i < result.subset.length; i++) {
                    for (let j = 0; j < i; j++) {
                        if (graph.hasEdge(result.subset[i], result.subset[j])) {
                            hasAtLeastOneEdge = true
                            break
                        }
                    }
                }

                if (!hasAtLeastOneEdge) {
                    return false
                }
            }

            // 2 and 1 or 2 is not interesting when they share a common neighbor
            if (result.subsetColors.canBeTwoColors && !result.subsetColors.canBeThreeColors) {
                for (let i = 0; i < graph.size(); i++) {
                    if (result.subset.every(vertex => graph.hasEdge(vertex, i))) {
                        return false
                    }
                }
            }

            if (result.subset.length === graph.size()) {
                return false
            }

            return true
        })
}

function generateAllUniquePairs(n: number): [number, number][] {
    let result = new Array<[number, number]>()

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < i; j++) {
            result.push([i, j])
        }
    }

    return result
}


function subsetColors(subset: number[], colorings: Color[][]): SubsetColors {
    let result: SubsetColors = {
        canBeOneColor: false,
        canBeTwoColors: false,
        canBeThreeColors: false
    }

    for (let coloring of colorings) {
        let hasRed: boolean = false
        let hasGreen: boolean = false
        let hasBlue: boolean = false

        for (let vertex of subset) {
            switch (coloring[vertex]) {
                case 'Red':
                    hasRed = true
                    break

                case 'Green':
                    hasGreen = true
                    break

                case 'Blue':
                    hasBlue = true
                    break
            }
        }

        if (hasRed && hasGreen && hasBlue) {
            result.canBeThreeColors = true
        } else if (
            ( hasRed &&  hasGreen && !hasBlue) ||
            ( hasRed && !hasGreen &&  hasBlue) ||
            (!hasRed &&  hasGreen &&  hasBlue)
        ) {
            result.canBeTwoColors = true
        } else {
            result.canBeOneColor = true
        }
    }

    return result
}

function getSubsets(n: number): number[][] {
    if (n === 0) {
        return [[]]
    }

    const subsets = getSubsets(n - 1)
    return [...subsets, ...subsets.map(subset => [...subset, n - 1])]
}

function sorted(xs: number[]): boolean {
    for (let i = 0; i < xs.length - 1; i++) {
        if (xs[i] > xs[i + 1]) {
            return false
        }
    }

    return true
}

function contains(a: number[], b: number[]): boolean {
    const superset = new Set(a)

    for (let element of b) {
        if (!superset.has(element)) {
            return false
        }
    }

    return true
}

export function completeBipartiteSubgraphs(graph: Graph): [number[], number[]][] {
    const subsets = disjoint3subsets(graph.size())
    
    let result = new Array<[number[], number[]]>()
    for (let [as, bs, c] of subsets) {
        if (as.length !== 0 && bs.length !== 0 && isCompleteBipartiteSubgraph(graph, as, bs)) {
            result.push([as, bs])
        }
    }
    
    return result
}

function isCompleteBipartiteSubgraph(graph: Graph, as: number[], bs: number[]): boolean {
    for (let a of as) {
        for (let b of bs) {
            if (!graph.hasEdge(a, b)) {
                return false
            }
        }
    }
    
    return true
}

type Chi3Proof = {
    kind: 'Odd Cycle'
    vertices: number[]
    oddCycle: number[]
} | {
    kind: 'Xi'
    i1: number[]
    i2: number[]
    o1: number[]
    o2: number[]
}

function mustBe3(subsetColors: SubsetColors): boolean {
    return !subsetColors.canBeOneColor && !subsetColors.canBeTwoColors && subsetColors.canBeThreeColors
}

export function computeOddCycles(graph: Graph): Map<string, number[]> {
    let map = new Map<string, number[]>()
    
    for (let cycleLength = 3; cycleLength <= graph.size(); cycleLength += 2) {
        for (let cycle of findCycles(graph, cycleLength)) {
            const key = JSON.stringify([...cycle].sort((a, b) => a - b))
            map.set(key, cycle)
        }
    }
    
    return map
}

export function allOddCycles(graph: Graph): OddCycle[] {
    let alreadyFound = new Set<string>()
    let result = new Array<OddCycle>()

    for (let cycleLength = 3; cycleLength <= graph.size(); cycleLength += 2) {
        for (let cycle of findCycles(graph, cycleLength)) {
            const sortedCycle = [...cycle].sort((a, b) => a - b)
            const hash = JSON.stringify(sortedCycle)

            if (!alreadyFound.has(hash)) {
                alreadyFound.add(hash)
                result.push({cycle, vertices: sortedCycle})
            }
        }
    }

    return result
}

export function allZetas(graph: Graph, colorings: Color[][]): Map<string, SubsetColors> {
    let map = new Map<string, SubsetColors>()
    
    for (let subset of subsets(range(graph.size()))) {
        map.set(JSON.stringify(subset), subsetColors(subset, colorings))
    }
    
    return map
}

export function computeChi3Proof(graph: Graph, oddCycles: Map<string, number[]>, chi: Map<string, SubsetColors>): Map<string, Chi3Proof> {
    const subsets = disjoint3subsets(graph.size())
    
    let result = new Map<string, Chi3Proof>()
    findingI1I2s: for (let [i1, i2, o1o2] of subsets) {
        const o1o2key = JSON.stringify(o1o2)
        if (!mustBe3(chi.get(o1o2key))) continue findingI1I2s
        
        const o1o2oddCycle = oddCycles.get(o1o2key)
        
        if (o1o2oddCycle !== undefined) {
            result.set(o1o2key, {kind: 'Odd Cycle', vertices: o1o2, oddCycle: o1o2oddCycle})
            continue findingI1I2s
        }
        
        if (i1.length === 0 || i2.length === 0 || !isCompleteBipartiteSubgraph(graph, i1, i2)) continue findingI1I2s
        
        // i1 and i2 form a complete bipartite subgraph
        
        findingO1O2s: for (let [o1, o2] of overlapping2subsets(o1o2)) {
            if (o1.length === 0 || o2.length === 0) continue findingO1O2s
        
            const o1key = JSON.stringify(o1)
            const o2key = JSON.stringify(o2)
            
            if (mustBe3(chi.get(o1key)) || mustBe3(chi.get(o2key))) continue findingO1O2s
            
            const o1i1key = JSON.stringify(merge(o1, i1))

            const o1i1oddCycle = oddCycles.get(o1i1key)

            if (o1i1oddCycle === undefined) continue findingO1O2s

            const o2i2key = JSON.stringify(merge(o2, i2))

            if (!mustBe3(chi.get(o2i2key))) continue findingO1O2s

            result.set(o1o2key, {kind: 'Xi', i1, i2, o1, o2})
            continue findingI1I2s
        }
    }
    
    return result
}

export function vertexColor(v: number, proof: Chi3Proof): 'white' | 'red' | 'pink' | 'blue' | 'lightblue' | 'purple' | 'green' {
    if (proof.kind === 'Odd Cycle') {
        return elementOf(v, proof.vertices) ? 'green' : 'white'
    }
    
    const {i1, i2, o1, o2} = proof
    
    if (elementOf(v, i1)) {
        return 'pink'
    }
    
    if (elementOf(v, i2)) {
        return 'lightblue'
    }
    
    const elementOfo1 = elementOf(v, o1)
    const elementOfo2 = elementOf(v, o2)
    
    if (elementOfo1 && elementOfo2) {
        return 'purple'
    } else if (elementOfo1) {
        return 'red'
    } else if (elementOfo2) {
        return 'blue'
    }
    
    return 'white'
}

export function xiVertexColor(v: number, xi: Xi): 'white' | 'red' | 'pink' | 'blue' | 'lightblue' | 'purple' | 'green' {
    const {i1, i2, o1, o2} = xi
    
    if (elementOf(v, i1)) {
        return 'pink'
    }
    
    if (elementOf(v, i2)) {
        return 'lightblue'
    }
    
    const elementOfo1 = elementOf(v, o1)
    const elementOfo2 = elementOf(v, o2)
    
    if (elementOfo1 && elementOfo2) {
        return 'purple'
    } else if (elementOfo1) {
        return 'red'
    } else if (elementOfo2) {
        return 'blue'
    }

    return 'white'
}

export function oddCycleVertexColor(v: number, oddCycle: OddCycle): 'white' | 'gray' {
    return elementOf(v, oddCycle.vertices) ? 'gray' : 'white'
}

export function edgeInOddCycle(u: number, v: number, oddCycle: OddCycle) {
    for (let i = 0; i < oddCycle.cycle.length - 1; i++) {
        if ((u === oddCycle.cycle[i] && v === oddCycle.cycle[i + 1]) || (v === oddCycle.cycle[i] && u === oddCycle.cycle[i + 1])) {
            return true
        }
    }

    if (
        (u === oddCycle.cycle[oddCycle.cycle.length - 1] && v === oddCycle.cycle[0]) ||
        (v === oddCycle.cycle[oddCycle.cycle.length - 1] && u === oddCycle.cycle[0])
    ) {
        return true
    }

    return false
}

export function subsets<T>(xs: T[]): T[][] {
    let result = new Array<T[]>()
    
    result.push([])
    
    for (let x of xs) {
        const currentLength = result.length;
        for (let j = 0; j < currentLength; j++) {
            const y = result[j]
            result.push([...y, x])
        }
    }
    
    return result
}

export function nonemptySubsets<T>(xs: T[]): T[][] {
    const [_, ...rest] = subsets(xs)
    return rest
}

export function nonemptyStrictSubsets<T>(xs: T[]): T[][] {
    return subsets(xs).slice(1, -1)
}

function disjoint3subsets(n: number): [number[], number[], number[]][] {
    let result = new Array<[number[], number[], number[]]>()
    result.push([[], [], []])

    for (let i = 0; i < n; i++) {
        const currentLength = result.length
        for (let j = 0; j < currentLength; j++) {
            const [a, b, c] = result[j]
            result.push([[...a, i], b, c])
            result.push([a, [...b, i], c])
            result.push([a, b, [...c, i]])
        }
    }

    return result
}

export function overlapping2subsets<T>(xs: T[]): [T[], T[]][] {
    let current = new Array<[T[], T[]]>()
    let previous = new Array<[T[], T[]]>()
    

    previous.push([[], []])
    for (let x of xs) {
        for (let [first, second] of previous) {
            const firstWithX = [...first, x]
            const secondWithX = [...second, x]
            current.push([firstWithX, second])
            current.push([first, secondWithX])
            current.push([firstWithX, secondWithX])
        }
        
        previous = current
        current = []
    }
    
    return previous
}

export function generateXis(graph: Graph, oddCycles: OddCycle[]): Xi[] {
    let oddCycleMap = new Map<string, OddCycle>()
    let allKnownZeta3s = new Set<string>()

    for (let oddCycle of oddCycles) {
        const key = JSON.stringify(oddCycle.vertices)
        oddCycleMap.set(key, oddCycle)
        allKnownZeta3s.add(key)
    }

    let currentXisWithSubsets = new Map<string, Xi>()
    // Initially use odd cycles
    for (let i = 0; i < oddCycles.length; i++) {
        for (let j = 0; j < i; j++) {
            const a = oddCycles[i]
            const b = oddCycles[j]

            const xis = allXis(graph, a.vertices, b.vertices)

            for (let xi of xis) {
                const key = JSON.stringify(xi.o1o2)
                currentXisWithSubsets.set(key, xi)
            }
        }
    }

    let currentXis = /* currentXisWithSubsets */ withoutSubsets(currentXisWithSubsets, allKnownZeta3s)

    return [...currentXis.values()]
}

export function generateZeta3Proofs(graph: Graph, oddCycles: OddCycle[]): Zeta3Proof[] {
    let proofs: Zeta3Proof[] = oddCycles.map(oddCycle => ({startingOddCycle: oddCycle, xisAndOddCycles: []}))
    let alreadyFound = Immutable.Set(oddCycles.map(oddCycle => Immutable.List(oddCycle.vertices)))

    let totalProofs = proofs
    let currentProofs = proofs

    while (currentProofs.length !== 0) {
        let nextProofs: Zeta3Proof[] = []

        for (let proof of currentProofs) {
            for (let oddCycle of oddCycles) {
                for (let newXi of allXis(graph, zeta3(proof), oddCycle.vertices)) {
                    const newZeta3 = Immutable.List(newXi.o1o2)
                    if (!alreadyFound.has(newZeta3)) {
                        const newProof: Zeta3Proof = {
                            startingOddCycle: proof.startingOddCycle,
                            xisAndOddCycles: [...proof.xisAndOddCycles, [newXi, oddCycle]]
                        }

                        nextProofs.push(newProof)
                        totalProofs.push(newProof)
                        alreadyFound = alreadyFound.add(newZeta3)
                    }
                }
            }
        }

        currentProofs = nextProofs
    }

    return totalProofs.filter(proof =>
        !nonemptyStrictSubsets(zeta3(proof)).some(subset => alreadyFound.has(Immutable.List(subset)))
    )
}

function allXis(graph: Graph, knownZeta3: SortedNumbers, oddCycle: SortedNumbers): Xi[] {
    let edges = new Array<[number, number]>()

    for (let u of knownZeta3) {
        for (let v of oddCycle) {
            if (graph.hasEdge(u, v) && !elementOf(u, oddCycle) && !elementOf(v, knownZeta3)) {
                edges.push([u, v])
            }
        }
    }

    const edgeSubsets = nonemptySubsets(edges)

    let result = new Array<Xi>()
    for (let edgeSubset of edgeSubsets) {
        if (isCompleteBipartite(graph, edgeSubset)) {
            result.push(asXi(knownZeta3, oddCycle, edgeSubset))
        }
    }

    return result
}

export type OddCycle = {
    vertices: SortedNumbers
    cycle: number[]
}

export type Xi = {
    o1: SortedNumbers
    o2: SortedNumbers
    i1: SortedNumbers
    i2: SortedNumbers
    o1o2: SortedNumbers
}

export type Zeta3Proof = {
    startingOddCycle: OddCycle
    xisAndOddCycles: [Xi, OddCycle][]
}

function asXi(o1i1: SortedNumbers, o2i2: SortedNumbers, i1i2: [number, number][]): Xi {
    let repeatedI1 = new Array<number>()
    let repeatedI2 = new Array<number>()
    
    for (let [u, v] of i1i2) {
        repeatedI1.push(u)
        repeatedI2.push(v)
    }
    
    const i1 = sortedUniques(repeatedI1)
    const i2 = sortedUniques(repeatedI2)
    const o1 = o1i1.filter(x => !elementOf(x, i1)) // filter preserves sortedness
    const o2 = o2i2.filter(x => !elementOf(x, i2))
    const o1o2 = mergeUnique(o1, o2)
    
    return { i1, i2, o1, o2, o1o2 }
}

export function isCompleteBipartite(graph: Graph, edges: [number, number][]): boolean {
    let us = new Array<number>()
    let vs = new Array<number>()
    
    for (let [u, v] of edges) {
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


export function rotate<T>(previous: T[], current: T, rest: T[]): [T[], T, T[]] {
    if (rest.length === 0) {
        if (previous.length === 0) {
            return [previous, current, rest]
        }

        const [x, ...xs] = previous
        return [[], x, [...xs, current]]
    }

    const [y, ...ys] = rest
    return [[...previous, current], y, ys]
}

function withoutSubsets(map: Map<string, Xi>, set: Set<string>): Map<string, Xi> {
    let mapWithoutSubsets = new Map<string, Xi>()

    for (let [key, xi] of map.entries()) {
        if (!nonemptyStrictSubsets(xi.o1o2).some(subset => {
            let subsetKey = JSON.stringify(subset)
            return set.has(subsetKey) || mapWithoutSubsets.has(subsetKey)
        })) {
            mapWithoutSubsets.set(key, xi)
        }
    }

    return mapWithoutSubsets
}

function zeta3(proof: Zeta3Proof): SortedNumbers {
    if (proof.xisAndOddCycles.length === 0) {
        return proof.startingOddCycle.vertices
    }

    const [xi, _] = proof.xisAndOddCycles[proof.xisAndOddCycles.length - 1]
    return xi.o1o2
}
