<script lang="ts">
	import { asGraph } from "./analyze";
	import { oddCycleVertexColor, allOddCycles, rotate, edgeInOddCycle, generateXis, xiVertexColor, subsets, allZetas } from './coloring'
	import type { Color, OddCycle, Xi } from './coloring';
	import type { Q } from './Q'
	import { generateQs, allOddCycles as allOddCycles2, qVertexColor, qMentionedEdge } from './Q'

	type SelectionState = {
		name: 'Not Yet Computed'
	} | {
		name: 'Computed'
		previousOddCycles: OddCycle[]
		currentOddCycle: OddCycle
		restOddCycles: OddCycle[]
	} | {
		name: 'No Odd Cycles'
	} | {
		name: 'Xis Computed'
		oddCycles: OddCycle[]
		previousXis: Xi[],
		currentXi: Xi,
		restXis: Xi[]
	} | {
		name: 'No Xis'
	} | {
		name: 'No Qs'
	} | {
		name: 'Qs Computed'
		previousQs: Q[],
		currentQ: Q
		restQs: Q[]
	}

	let selectionState: SelectionState = {name: 'Not Yet Computed'}

	type EditingState = {
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

	let editingState: EditingState = {name: 'Neutral'}
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
		if (selectionState.name === 'Computed') {
			return edgeInOddCycle(u, v, selectionState.currentOddCycle)
		}

		if (selectionState.name === 'Qs Computed') {
			return qMentionedEdge(u, v, selectionState.currentQ)
		}

		return false
	}

	function edgeColor(u: number, v: number): 'red' | 'blue' | 'purple' | 'green' | 'black' {
		return 'black'
	}

	function vertexColor(vertex: number): string {
		if (selectionState.name === 'Computed') {
			return oddCycleVertexColor(vertex, selectionState.currentOddCycle)
		}

		if (selectionState.name === 'Xis Computed') {
			return xiVertexColor(vertex, selectionState.currentXi)
		}

		if (selectionState.name === 'Qs Computed') {
			return qVertexColor(vertex, selectionState.currentQ)
		}

		return 'white'
	}
</script>

<main>
<p>
	<svg
		on:mousemove|preventDefault={event => {
			if (editingState.name === 'Dragging') {
				const { cursorX, cursorY } = cursorPosition(event)
				xs[editingState.vertex] = cursorX
				ys[editingState.vertex] = cursorY
				editingState = { name: 'Dragging', vertex: editingState.vertex, ...cursorPosition(event)	}		
			} else if (editingState.name === 'MakingEdge') {
				editingState = { name: 'MakingEdge', source: editingState.source, ...cursorPosition(event) }
			}
		}}
		on:mouseup|preventDefault={event => {
			if (editingState.name === 'Neutral') {
				addVertex(event)
			} else if (editingState.name === 'MakingEdge') {
				editingState = { name: 'Neutral' }
			} else if (editingState.name === 'SnappedEdge') {
				addEdge(editingState.source, editingState.destination)
				editingState = { name: 'Hover', vertex: editingState.destination }
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
					if (editingState.name === 'MakingEdge' && vertex !== editingState.source && !edgeExists(vertex, editingState.source)) {
						editingState = { name: 'SnappedEdge', source: editingState.source, destination: vertex }
					}
				}}

				on:mouseleave|preventDefault={event => {
					if (editingState.name === 'SnappedEdge') {
						editingState = { name: 'MakingEdge', source: editingState.source, ...cursorPosition(event) }
					}
				}}

				on:click|preventDefault={_ => {
					if (editingState.name === 'SnappedEdge') {
						addEdge(editingState.source, editingState.destination)
						editingState = { name: 'Neutral' }
					}
				}}
			/>

			<g
				on:mouseover|preventDefault={_ => {
					if (editingState.name === 'Neutral') {
						editingState = { name: 'Hover', vertex	}
					} else if (editingState.name === 'MakingEdge' && vertex !== editingState.source && !edgeExists(vertex, editingState.source)) {
						editingState = { name: 'SnappedEdge', source: editingState.source, destination: vertex }
					}
				}}

				on:mouseleave|preventDefault={event => {
					if (editingState.name === 'Hover') {
						editingState = { name: 'Neutral' }
					} else if (editingState.name === 'SnappedEdge') {
						editingState = { name: 'MakingEdge', source: editingState.source, ...cursorPosition(event) }
					}
				}}

				on:mousedown|preventDefault={event => {
					if (editingState.name === 'Hover') {
						const { cursorX, cursorY } = cursorPosition(event)
						editingState = { name: 'Dragging', vertex: editingState.vertex, cursorX, cursorY }
					}
				}}

				on:mouseup|preventDefault={_ => {
					if (editingState.name === 'Dragging') {
						editingState = { name: 'Hover', vertex: editingState.vertex }
					} else if (editingState.name === 'MakingEdge') {
						editingState = { name: 'Hover', vertex: editingState.source }
					} else if (editingState.name === 'SnappedEdge') {
						addEdge(editingState.source, editingState.destination)
						editingState = { name: 'Hover', vertex: editingState.destination }
					}
				}}

				on:mousemove|preventDefault={event => {
					if (editingState.name === 'Dragging') {
						const { cursorX, cursorY } = cursorPosition(event)
						xs[vertex] = cursorX
						ys[vertex] = cursorY
						editingState = { name: 'Dragging', vertex: editingState.vertex, cursorX, cursorY }		
					}
				}}

				on:dblclick|preventDefault={event => {
					if (editingState.name === 'Hover') {
						editingState = {
							name: 'MakingEdge',
							source: vertex,
							cursorX: xs[vertex],
							cursorY: ys[vertex]
						}
					}
				}}

				on:auxclick|preventDefault={event => {
					if (editingState.name === 'Hover') {
						removeVertex(editingState.vertex)
						editingState = { name: 'Neutral' }
					}
				}}

				on:contextmenu|preventDefault
			>
				<circle
					class={
						(editingState.name === 'Hover' || editingState.name === 'Dragging') && editingState.vertex === vertex
							? (editingState.name === 'Hover' ? 'hovering' : 'dragging')
							: 'neutral'
					}
					cx={xs[vertex]}	cy={ys[vertex]}	r="20" fill={vertexColor(vertex)} stroke="black"
				/>

				<text x={xs[vertex]} y={ys[vertex]}>{vertex}</text>
			</g>
		{/each}

		{#if editingState.name === 'MakingEdge'}
			<line
				class="preview-line"
				stroke="black"

				x1={xs[editingState.source]}
				y1={ys[editingState.source]}

				x2={editingState.cursorX}
				y2={editingState.cursorY}
			/>
		{/if}

		{#if editingState.name === 'SnappedEdge'}
			<line
				class="preview-line"
				stroke="black"

				x1={xs[editingState.source]}
				y1={ys[editingState.source]}


				x2={xs[editingState.destination]}
				y2={ys[editingState.destination]}
			/>
		{/if}
	</svg>
</p>
</main>

<button on:click={() => {
	const graph = asGraph(vertices.length, edges)
	const oddCycles = allOddCycles(graph)

	if (oddCycles.length === 0) {
		selectionState = {
			name: 'No Odd Cycles'
		}
	} else {
		const [first, ...rest] = oddCycles
		selectionState = {
			name: 'Computed',
			previousOddCycles: [],
			currentOddCycle: first,
			restOddCycles: rest
		}
	}

	edges = edges
	vertices = vertices
}}>Find Odd Cycles</button>

<button disabled={selectionState.name !== 'Computed'} on:click={() => {
	if (selectionState.name === 'Computed') {
		const [newPrevious, newCurrent, newRest] = rotate(selectionState.previousOddCycles, selectionState.currentOddCycle, selectionState.restOddCycles)

		selectionState = {
			name: 'Computed',
			previousOddCycles: newPrevious,
			currentOddCycle: newCurrent,
			restOddCycles: newRest
		}
	}

	edges = edges
	vertices = vertices
}}>Next Odd Cycle</button>

<button disabled={selectionState.name !== 'Computed'} on:click={() => {
	if (selectionState.name === 'Computed') {
		const graph = asGraph(vertices.length, edges)
		const oddCycles = [
			...selectionState.previousOddCycles,
			selectionState.currentOddCycle,
			...selectionState.restOddCycles
		]
		const result = generateXis(graph, oddCycles)

		if (result.length === 0) {
			selectionState = {
				name: 'No Xis'
			}
		} else {
			const [first, ...rest] = result
			selectionState = {
				name: 'Xis Computed',
				oddCycles,
				previousXis: [],
				currentXi: first,
				restXis: rest
			}
		}
	}


	edges = edges
	vertices = vertices
}}>Find Xis</button>

<button disabled={selectionState.name !== 'Xis Computed'} on:click={() => {
	if (selectionState.name === 'Xis Computed') {
		const [newPrevious, newCurrent, newRest] = rotate(selectionState.previousXis, selectionState.currentXi, selectionState.restXis)

		selectionState = {
			name: 'Xis Computed',
			oddCycles: selectionState.oddCycles,
			previousXis: newPrevious,
			currentXi: newCurrent,
			restXis: newRest
		}
	}

	edges = edges
	vertices = vertices
}}>Next Xi</button>


<button on:click={() => {
	const graph = asGraph(vertices.length, edges)
	const oddCycles = allOddCycles2(graph)

	const result = generateQs(graph, oddCycles)

	if (result.length === 0) {
		selectionState = {
			name: 'No Qs'
		}
	} else {
		const [first, ...rest] = result
		selectionState = {
			name: 'Qs Computed',
			previousQs: [],
			currentQ: first,
			restQs: rest
		}
	}

	edges = edges
	vertices = vertices
}}>Find Qs</button>

<button disabled={selectionState.name !== 'Qs Computed'} on:click={() => {
	if (selectionState.name === 'Qs Computed') {
		const [newPrevious, newCurrent, newRest] = rotate(selectionState.previousQs, selectionState.currentQ, selectionState.restQs)

		selectionState = {
			name: 'Qs Computed',
			previousQs: newPrevious,
			currentQ: newCurrent,
			restQs: newRest
		}
	}

	edges = edges
	vertices = vertices
}}>Next Q</button>

<button disabled={selectionState.name !== 'Qs Computed'} on:click={() => {
	if (selectionState.name !== 'Qs Computed') return
	console.log(selectionState.currentQ)

	for (let {u, v} of selectionState.currentQ.cycleEdges) {
		console.log({u, v})
	}

	for (let [u, v] of edges) {
		console.log(`Has (${u}, ${v})`, mentionedEdge(u, v))
		console.log(`Has (${v}, ${u})`, mentionedEdge(v, u))

	}

	for (let v of selectionState.currentQ.zeta3Vertices) {
		console.log(v)
	}
}}>Print</button>

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
