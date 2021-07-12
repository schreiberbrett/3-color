<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { E } from './coloring'
    import { convert } from './coloring'
    import type { Maybe } from './Maybe'
    import { Just, Nothing } from './Maybe';
    export let e: E

    const dispatch = createEventDispatcher<{change: E}>()

    let brett: Maybe<E>[][]
    $: brett = convert(e)

    function map<A, B>(f: (a: A) => B, x: Maybe<A>[][]): Maybe<B>[][] {
        return x.map(y => y.map(z => z.kind === 'Just' ? Just(f(z.value)) : Nothing()))
    } 
</script>

<table>
    {#each brett as row, index}
        <tr>
            {#each row as cell}
            <td colspan={Math.pow(2, brett.length - 1 - index)}>
                {#if cell.kind === 'Just'}
                    <button on:click={_ => dispatch('change', cell.value)}>{cell.value.kind === 'Xi' ? 'Ξ' : '⬠'}</button>
                {/if}
            </td>
            {/each}
        </tr>
    {/each}
</table>

<style>
    td {
        text-align: center;
    }
    button {
        width: 100%;
        height: 100%;
    }
</style>