import { range, findCycles } from "./analyze";
import type { Graph } from "./Graph";
import { isJust, Just, justs, Maybe, Nothing } from "./Maybe";
import { PairSet } from "./PairSet";
import { elementOf, mergeUnique, SortedNumbers, sortedUniques } from "./SortedNumbers";
import * as Immutable from 'immutable'
import { Either, Left, Right } from "./Either"

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

export type E = {
  kind: 'Odd Cycle'
  cycle: number[]
  zeta3vertices: SortedNumbers
  proofHeight: 0
} | {
  kind: 'Xi'
  zeta3vertices: SortedNumbers
  o1: SortedNumbers
  i1: SortedNumbers
  o2: SortedNumbers
  i2: SortedNumbers
  o1i1: E
  o2i2: E
  proofHeight: number
}

export function proofTrees(graph: Graph): E[] {
    const e0sWithSupersets: E[] = allOddCycles(graph).map(x => ({kind: 'Odd Cycle', cycle: x.cycle, zeta3vertices: x.vertices, proofHeight: 0}))
    const [e0s, _] = withoutSupersets(e0sWithSupersets, [])

    return helper2(graph, e0s, e0s)
}

function helper2(graph: Graph, ens: E[], e0tons: E[]): E[] {
    const nextLayerWithSupersets = e_n1(graph, ens, e0tons)

    const [newE0ToNs, nextLayer] = withoutSupersets(e0tons, nextLayerWithSupersets)

    if (nextLayer.length === 0) {
        return newE0ToNs.sort(byProofHeightThenNumberOfVertices)
    }

    return helper2(graph, nextLayer, [...newE0ToNs, ...nextLayer])
}


function e_n1(graph: Graph, ens: E[], e0tons: E[]): E[] {
    let result: E[] = []

    for (let en of ens) {
        for (let e0ton of e0tons) {
            for (let [o1, i1] of breakdowns(en.zeta3vertices)) {
                for (let [o2, i2] of breakdowns(e0ton.zeta3vertices)) {
                    if (xi(graph, o1, i1, i2, o2)) {
                        const proofHeight = Math.max(
                            en.kind    === 'Odd Cycle' ? 0 : en.proofHeight,
                            e0ton.kind === 'Odd Cycle' ? 0 : e0ton.proofHeight
                        ) + 1

                        result.push({
                            kind: 'Xi',
                            o1,
                            i1,
                            i2,
                            o2,
                            zeta3vertices: mergeUnique(o1, o2),
                            o1i1: en,
                            o2i2: e0ton,
                            proofHeight
                        })
                    }
                }
            }
        }
    }

    return result
}

export function breakdowns(xs: SortedNumbers): [SortedNumbers, SortedNumbers][] {
    if (xs.length === 0) {
        return [[[], []]]
    }

    const [first, ...rest] = xs // The cons of a list of sorted numbers is still sorted

    const restBreakdowns: [SortedNumbers, SortedNumbers][] = breakdowns(rest)

    let result = new Array<[SortedNumbers, SortedNumbers]>()
    for (let [a, b] of restBreakdowns) {
        result.push([[first, ...a], b])
        result.push([a, [first, ...b]])
    }

    return result
}

function xi(graph: Graph, o1: SortedNumbers, i1: SortedNumbers, i2: SortedNumbers, o2: SortedNumbers): boolean {
    return (
        i1.length !== 0 &&
        i2.length !== 0 &&
        (o1.length + o2.length) !== 0 &&
        disjoint(i1, i2) &&
        disjoint(o1, i2) &&
        disjoint(o2, i1) &&
        isCompleteBipartiteSubgraph(graph, i1, i2)
    )
}

function disjoint(a: SortedNumbers, b: SortedNumbers): boolean {
    return !a.some(x => elementOf(x, b))
}

function withoutSupersets(l: E[], r: E[]): [E[], E[]] {
    // concatenate, sort, filter, unzip
    const concatenated = [...l.map(x => Left<E, E>(x)), ...r.map(x => Right<E, E>(x))]

    const sorted = [...concatenated].sort((a, b) => byNumberOfVerticesThenProofHeight(value(a), value(b)))

    let knownZeta3s = new Set<string>()
    let zipped = new Array<Either<E, E>>()
    for (let e of sorted) {
        if (!subsets(value(e).zeta3vertices).some(subset => knownZeta3s.has(JSON.stringify(subset)))) {
            knownZeta3s.add(JSON.stringify(value(e).zeta3vertices))
            zipped.push(e)
        }
    }

    return unzip(zipped)
}

function byNumberOfVerticesThenProofHeight(a: E, b: E): number {
    if (a.zeta3vertices.length === b.zeta3vertices.length) {
        return a.proofHeight - b.proofHeight
    }

    return a.zeta3vertices.length - b.zeta3vertices.length
}

function byProofHeightThenNumberOfVertices(a: E, b: E): number {
    if (a.proofHeight === b.proofHeight) {
        return a.zeta3vertices.length - b.zeta3vertices.length
    }

    return a.proofHeight - b.proofHeight
}

function unzip<L, R>(eithers: Either<L, R>[]): [L[], R[]] {
    let lefts = new Array<L>()
    let rights = new Array<R>()

    for (let x of eithers) {
        if (x.kind === 'Left') {
            lefts.push(x.left)
        } else {
            rights.push(x.right)
        }
    }

    return [lefts, rights]
}

function value<T>(either: Either<T, T>): T {
    return either.kind === 'Left' ? either.left : either.right
}

export function convert(e: E): Maybe<E>[][] {
    if (e.kind === 'Odd Cycle') {
        return singleton(e)
    }

    return [[Just(e)], ...concat(convert(e.o1i1), convert(e.o2i2))]
}

function concat<T>(a: Maybe<T>[][], b: Maybe<T>[][]): Maybe<T>[][] {
    const [x, y] = [smaller(a, b), larger(a, b)]

    const deficit = y.length - x.length

    const paddedX = pad(x, deficit)

    return zip(paddedX, y).map(([xs, ys]) => [...xs, ...ys])
}

function smaller<T>(a: Maybe<T>[][], b: Maybe<T>[][]): Maybe<T>[][] {
    return (a.length < b.length) ? a : b
}

function larger<T>(a: Maybe<T>[][], b: Maybe<T>[][]): Maybe<T>[][] {
    return (a.length >= b.length) ? a : b
}

function zip<A, B>(a: A[], b: B[]): [A, B][] {
    let result = new Array<[A, B]>()
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        result.push([a[i], b[i]])
    }

    return result
}

function pad<T>(x: Maybe<T>[][], depth: number): Maybe<T>[][] {
    let result = new Array<Maybe<T>[]>()

    for (let row of x) {
        result.push(row)
    }

    for (let i = x.length; i < (x.length + depth); i++) {
        result.push(range(Math.pow(2, i)).map(_ => Nothing()))
    }

    return result
}

function singleton<T>(x: T): Maybe<T>[][] {
    return [[Just(x)]]
}