export type SortedNumbers = number[]

export function merge(arr1: SortedNumbers, arr2: SortedNumbers): SortedNumbers {
    let merged: SortedNumbers = new Array<number>(arr1.length + arr2.length);
    let index1 = 0;
    let index2 = 0;
    let current = 0;

    while (current < (arr1.length + arr2.length)) {
        let isArr1Depleted = index1 >= arr1.length;
        let isArr2Depleted = index2 >= arr2.length;

        if (!isArr1Depleted && (isArr2Depleted || (arr1[index1] < arr2[index2]))) {
            merged[current] = arr1[index1];
            index1++;
        } else {
            merged[current] = arr2[index2];
            index2++;
        }

        current++;
  }

  return merged;
}

export function mergeUnique(as: SortedNumbers, bs: SortedNumbers): SortedNumbers {
    let result: SortedNumbers = []
    let aIndex = 0
    let bIndex = 0

    while (true) {
        if (aIndex === as.length) {
            while (bIndex < bs.length) {
                result.push(bs[bIndex])
                bIndex++
            }

            break
        }

        if (bIndex === bs.length) {
            while (aIndex < as.length) {
                result.push(as[aIndex])
                aIndex++
            }

            break
        }

        const a = as[aIndex]
        const b = bs[bIndex]

        if (a > b) {
            result.push(b)
            bIndex++
        } else if (a < b) {
            result.push(a)
            aIndex++
        } else {
            result.push(a)
            aIndex++
            bIndex++
        }
    }

    return result
}

export function elementOf(x: number, xs: SortedNumbers): boolean {
    let start = 0
    let end = xs.length - 1;

    while (start <= end) {
        let mid = Math.floor((start + end) / 2)
        let elem = xs[mid]


        if (elem === x) {
            return true
        } else if (elem < x) {
            start = mid + 1
        } else {
            end = mid - 1
        }
    }

    return false;
}

export function sortedUniques(xs: number[]): SortedNumbers {
    return [...(new Set(xs)).values()].sort((a, b) => a - b)
}

export function equals_SortedNumbers(a: SortedNumbers, b: SortedNumbers): boolean {
    if (a.length !== b.length) {
        return false
    }

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false
        }
    }

    return true
}
