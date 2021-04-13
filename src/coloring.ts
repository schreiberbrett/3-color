import { allOddCycles, range } from "./analyze";
import type { Graph } from "./Graph";
import { isJust, Just, justs, Maybe, Nothing } from "./Maybe";

export type Color = 'Red' | 'Green' | 'Blue'


export function allColorings(graph: Graph): Color[][] {
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

export function whatColors(graph: Graph, colorings: Color[][]): {subset: number[], subsetColors: SubsetColors}[] {
    const numberOfVertices = colorings[0].length
    const subsets = getSubsets(numberOfVertices)
    const oddCycles = allOddCycles(graph)

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