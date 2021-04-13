import type { Either } from "./Either"

// Has the form "BABABA".... "C" (ba)*c
function iterate<A, B, C>(f: (a: A) => Either<[B, A], C>, start: A): [[B, A][], C] {
    const result = f(start)

    switch (result.kind) {
        case 'Left':
            const [byproduct, newStart] = result.left
            const [list, c1] = iterate(f, newStart)
            return [[[byproduct, newStart], ...list], c1]

        case 'Right':
            return [[], result.right]
    }
}