<script lang="ts">
	import { asGraph } from "./analyze";
	import { proofTrees, oddCycleVertexColor, allOddCycles, edgeInOddCycle, generateZeta3Proofs, xiVertexColor, breakdowns } from './coloring'
	import type { Color, OddCycle, Xi, Zeta3Proof, E } from './coloring';
	import type { Maybe } from './Maybe'
	import { Nothing, Just } from "./Maybe";
	import { elementOf } from "./SortedNumbers";

	let eIndex = 0

	let maybeProofTrees: Maybe<E[]> = Nothing()

	type SelectionState = {
		name: 'Not Computed'
	} | {
		name: 'Computed'
		zeta3Proofs: Zeta3Proof[]
		proofIndex: number
		proofStepIndex: number
	}

	let selectionState: SelectionState = {name: 'Not Computed'}

	let proofIndexMax: number
	$: proofIndexMax = selectionState.name === 'Not Computed' ? 0 : selectionState.zeta3Proofs.length - 1

	let proofStepIndexMax: number
	$: proofStepIndexMax = selectionState.name === 'Not Computed' ? 0 : selectionState.zeta3Proofs[selectionState.proofIndex].xisAndOddCycles.length

	type CurrentView = {
		name: 'Odd Cycle'
		oddCycle: OddCycle
	} | {
		name: 'Xi'
		oddCycle: OddCycle
		xi: Xi
	} | {
		name: 'Neither'
	}

	let currentView: CurrentView
	$: currentView = function (): CurrentView {
		if (selectionState.name === 'Not Computed' || selectionState.zeta3Proofs.length === 0) {
			return {name: 'Neither'}
		}

		const currentProof = selectionState.zeta3Proofs[selectionState.proofIndex]
		if (selectionState.proofStepIndex === 0) {
			return {name: 'Odd Cycle', oddCycle: currentProof.startingOddCycle}
		}

		const [xi, oddCycle] = currentProof.xisAndOddCycles[selectionState.proofStepIndex - 1]

		return { name: 'Xi', oddCycle, xi }
	}()

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
		if (currentView.name === 'Neither') {
			return false
		}

		return edgeInOddCycle(u, v, currentView.oddCycle)
	}

	function edgeColor(u: number, v: number): 'red' | 'blue' | 'purple' | 'green' | 'black' {
		return 'black'
	}

	function vertexColor(vertex: number): string {
		if (maybeProofTrees.kind === 'Just') {
			const e = maybeProofTrees.value[eIndex]
			if (e.kind === 'Xi') {
				return xiVertexColor(vertex, {o1: e.o1, o2: e.o2, i1: e.i1, i2: e.i2, o1o2: e.zeta3vertices})
			} else {
				return elementOf(vertex, e.zeta3vertices) ? 'gray' : 'white'
			}
		}

		if (currentView.name === 'Neither') {
			return 'white'
		}

		if (currentView.name === 'Odd Cycle') {
			return oddCycleVertexColor(vertex, currentView.oddCycle)
		}

		return xiVertexColor(vertex, currentView.xi)
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

	selectionState = {
		name: 'Computed',
		zeta3Proofs: generateZeta3Proofs(graph, allOddCycles(graph)),
		proofIndex: 0,
		proofStepIndex: 0
	}

	vertices = vertices
	edges = edges
}}>Calculate Proofs</button>

<p> Proof <input disabled={currentView.name === 'Neither'} type="number" min="0" max={proofIndexMax}
value={selectionState.name === 'Computed' ? selectionState.proofIndex : undefined}
	on:change={e => {
	const i = e.currentTarget.valueAsNumber

	if (selectionState.name === 'Computed') {
		selectionState = {
			...selectionState,
			proofIndex: i,
			proofStepIndex: selectionState.zeta3Proofs[i].xisAndOddCycles.length
		}
	}

	vertices = vertices
	edges = edges
}}> {#if selectionState.name === 'Computed'} of {selectionState.zeta3Proofs.length} {/if}
</p>
<p>Proof Step
<input disabled={currentView.name === 'Neither'} type="number" id="proof-index" min="0" max={proofStepIndexMax}
	value={selectionState.name === 'Computed' ? selectionState.proofStepIndex : undefined}
	on:change={e => {
	if (selectionState.name === 'Computed') {
		selectionState = {
			...selectionState,
			proofStepIndex: e.currentTarget.valueAsNumber
		}
	}

	vertices = vertices
	edges = edges
}}> {#if selectionState.name === 'Computed'} of {selectionState.zeta3Proofs[selectionState.proofIndex].xisAndOddCycles.length + 1} {/if} </p>

<button on:click={_ => {
	maybeProofTrees = Just(proofTrees(asGraph(vertices.length, edges)))

	eIndex = eIndex
	vertices = vertices
	edges = edges
}}>Proof Trees</button>

<p> E Index <input disabled={maybeProofTrees.kind === 'Nothing'} type="number" min="0" max={maybeProofTrees.kind === 'Just' ? maybeProofTrees.value.length - 1 : 0}
	value={maybeProofTrees.kind === 'Just' ? eIndex : 0}
		on:change={e => {
		const i = e.currentTarget.valueAsNumber
	
		if (maybeProofTrees.kind === 'Just') {
			eIndex = i
		} else {
			eIndex = 0
		}
	
		vertices = vertices
		edges = edges
	}}> {#if maybeProofTrees.kind === 'Just'} of {maybeProofTrees.value.length} {/if}
</p>

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
