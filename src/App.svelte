<script lang="ts">
	import { analyze, asGraph } from "./analyze";
	import type { Analysis } from './analyze'
	import { allColorings, whatColors } from './coloring'
	import type { Color } from './coloring';
	import Diamond from './primes/Diamond.svelte';
	import Qe8 from './primes/QE8.svelte';
import { isJust } from "./Maybe";


	type State = {
		name: 'Neutral'
	} | {
		name: 'Hover'
		vertex: number
	} | {
		name: 'Dragging'
		vertex: number
		cursorX: number
		cursorY: number
	} | {
		name: 'MakingEdge'
		source: number
		cursorX: number
		cursorY: number
	} | {
		name: 'SnappedEdge'
		source: number
		destination: number
	}
	let state: State = {name: 'Neutral'}
	let vertices: number[] = []
	let edges: [number, number][] = []
	let xs: number[] = []
	let ys: number[] = []

	function cursorPosition(event: MouseEvent): {cursorX: number, cursorY: number} {
		const svg = event.target as SVGGraphicsElement
		const CTM = svg.getScreenCTM()
		const cursorX = (event.clientX - CTM.e) / CTM.a
		const cursorY = (event.clientY - CTM.f) / CTM.d
		return {cursorX, cursorY}
	}
	function edgeExists(u: number, v: number) {
		return edges.some(([a, b]) => (a === u && b === v) || (a === v && b === u))
	}

	let colorings: {
		kind: 'Not Pressed'
	} | {
		kind: 'Colorable'
		left: Color[][]
		chosen: Color[]
		right: Color[][]
	} | {
		kind: 'Not Colorable'
	} = {kind: 'Not Pressed'}

	function addEdge(u: number, v: number) {
		edges = [...edges, [u, v]]
		undoColoring()
	}

	function addVertex(event: MouseEvent) {
		const { cursorX, cursorY } = cursorPosition(event)
		vertices = [...vertices, vertices.length]
		xs.push(cursorX)
		ys.push(cursorY)

		undoColoring()
	}

	function removeVertex(vertex: number) {
		const lastVertex = vertices.length - 1

		swapVertices(vertex, lastVertex)

		vertices.pop()
		edges = edges.filter(([a, b]) => a !== lastVertex && b !== lastVertex)

		xs.pop()
		ys.pop()

		undoColoring()
	}

	function undoColoring() {
		colorings = {kind: 'Not Pressed'}
		vertices = [...vertices]
	}

	function swapVertices(u: number, v: number): void {
		[xs[u], xs[v]] = [xs[v], xs[u]];
		[ys[u], ys[v]] = [ys[v], ys[u]];

		edges = edges.map(([a, b]) => {
			const newA = a === u ? v : a === v ? u : a
			const newB = b === u ? v : b === v ? u : b
			return [newA, newB]
		})
	}

	function mentionedEdge(u: number, v: number): boolean {
		return false
	}

	function edgeColor(u: number, v: number): 'red' | 'blue' | 'purple' | 'green' | 'black' {
		return 'black'
	}

	function vertexColor(vertex: number): 'red' | 'blue' | 'purple' | 'white' {
		return 'white'
	}

	function edgeEquals(u: number, v: number, [a, b]: [number, number]): boolean {
		return (u === a && v === b) || (u === b && v === a)
	}

</script>

<main>
<p>
	<svg
		on:mousemove|preventDefault={event => {
			if (state.name === 'Dragging') {
				const { cursorX, cursorY } = cursorPosition(event)
				xs[state.vertex] = cursorX
				ys[state.vertex] = cursorY
				state = { name: 'Dragging', vertex: state.vertex, ...cursorPosition(event)	}		
			} else if (state.name === 'MakingEdge') {
				state = { name: 'MakingEdge', source: state.source, ...cursorPosition(event) }
			}
		}}
		on:mouseup|preventDefault={event => {
			if (state.name === 'Neutral') {
				addVertex(event)
			} else if (state.name === 'MakingEdge') {
				state = { name: 'Neutral' }
			} else if (state.name === 'SnappedEdge') {
				addEdge(state.source, state.destination)
				state = { name: 'Hover', vertex: state.destination }
			}
		}}
		on:auxclick|preventDefault
		on:contextmenu|preventDefault
	>
		{#each edges as [a, b]}
			<line class="edge"
				stroke={edgeColor(a, b)}
				x1={xs[a]} y1={ys[a]}
				x2={xs[b]} y2={ys[b]}
				stroke-width={mentionedEdge(a, b) ? 3 : 1}
			/>
		{/each}

		{#each vertices as vertex}
			<circle	class="snappable-area" cx={xs[vertex]} cy={ys[vertex]} r="40" fill="none"
				on:mouseover|preventDefault={_ => {
					if (state.name === 'MakingEdge' && vertex !== state.source && !edgeExists(vertex, state.source)) {
						state = { name: 'SnappedEdge', source: state.source, destination: vertex }
					}
				}}

				on:mouseleave|preventDefault={event => {
					if (state.name === 'SnappedEdge') {
						state = { name: 'MakingEdge', source: state.source, ...cursorPosition(event) }
					}
				}}

				on:click|preventDefault={_ => {
					if (state.name === 'SnappedEdge') {
						addEdge(state.source, state.destination)
						state = { name: 'Neutral' }
					}
				}}
			/>

			<g
				on:mouseover|preventDefault={_ => {
					if (state.name === 'Neutral') {
						state = { name: 'Hover', vertex	}
					} else if (state.name === 'MakingEdge' && vertex !== state.source && !edgeExists(vertex, state.source)) {
						state = { name: 'SnappedEdge', source: state.source, destination: vertex }
					}
				}}

				on:mouseleave|preventDefault={event => {
					if (state.name === 'Hover') {
						state = { name: 'Neutral' }
					} else if (state.name === 'SnappedEdge') {
						state = { name: 'MakingEdge', source: state.source, ...cursorPosition(event) }
					}
				}}

				on:mousedown|preventDefault={event => {
					if (state.name === 'Hover') {
						const { cursorX, cursorY } = cursorPosition(event)
						state = { name: 'Dragging', vertex: state.vertex, cursorX, cursorY }
					}
				}}

				on:mouseup|preventDefault={_ => {
					if (state.name === 'Dragging') {
						state = { name: 'Hover', vertex: state.vertex }
					} else if (state.name === 'MakingEdge') {
						state = { name: 'Hover', vertex: state.source }
					} else if (state.name === 'SnappedEdge') {
						addEdge(state.source, state.destination)
						state = { name: 'Hover', vertex: state.destination }
					}
				}}

				on:mousemove|preventDefault={event => {
					if (state.name === 'Dragging') {
						const { cursorX, cursorY } = cursorPosition(event)
						xs[vertex] = cursorX
						ys[vertex] = cursorY
						state = { name: 'Dragging', vertex: state.vertex, cursorX, cursorY }		
					}
				}}

				on:dblclick|preventDefault={event => {
					if (state.name === 'Hover') {
						state = {
							name: 'MakingEdge',
							source: vertex,
							cursorX: xs[vertex],
							cursorY: ys[vertex]
						}
					}
				}}

				on:auxclick|preventDefault={event => {
					if (state.name === 'Hover') {
						removeVertex(state.vertex)
						state = { name: 'Neutral' }
					}
				}}

				on:contextmenu|preventDefault
			>
				<circle
					class={
						(state.name === 'Hover' || state.name === 'Dragging') && state.vertex === vertex
							? (state.name === 'Hover' ? 'hovering' : 'dragging')
							: 'neutral'
					}
					cx={xs[vertex]}	cy={ys[vertex]}	r="20" fill={vertexColor(vertex)} stroke="black"
				/>

				<text x={xs[vertex]} y={ys[vertex]}>{vertex}</text>
			</g>
		{/each}

		{#if state.name === 'MakingEdge'}
			<line
				class="preview-line"
				stroke="black"

				x1={xs[state.source]}
				y1={ys[state.source]}

				x2={state.cursorX}
				y2={state.cursorY}
			/>
		{/if}

		{#if state.name === 'SnappedEdge'}
			<line
				class="preview-line"
				stroke="black"

				x1={xs[state.source]}
				y1={ys[state.source]}


				x2={xs[state.destination]}
				y2={ys[state.destination]}
			/>
		{/if}
	</svg>
</p>
</main>

<button on:click={() => {
	const graph = asGraph(vertices.length, edges)
	const all = allColorings(graph)

	if (all.length === 0) {
		console.log('Not 3 colorable')
	} else {
		console.log(whatColors(graph, all))
	}

	vertices = [...vertices]
}}>What Colors</button>


<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}
	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
	svg {
		display: block;
		border: 1px solid black;
		height: 700px;
		width: 700px;
	}
	.hovering {
		cursor: grab;
	}
	.dragging {
		cursor: grabbing;
	}
	.snappable-area {
		pointer-events: all;
	}
	.preview-line {
		pointer-events: none;
	}
	.edge {
		cursor: pointer;
	}
</style>