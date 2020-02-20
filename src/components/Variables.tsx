///<reference path="../types/types.d.ts" />

import * as React from 'react'

import MathJax from 'react-mathjax2'
import Table from 'react-bootstrap/Table'

import ContentEditable from 'react-contenteditable'

/*
cost of sending and receiving an object migration
cost of sending and receiving an aura creation
cost of sending and receiving an aura update
cost of sending and receiving an aura deletion
cost of maintaining an aura on the sending and receiving side
and then of course cost of simulating an object, but this is really dependent on what it is doing (sleeping or not, number of contacts, number of nearby objects)
then you can calculate the cost of having a boundary in particular place, depending on all the above factors
there's also the cost of number of objects that are completely out of their host server's region as the islands check has to be performed on them
*/

export const constants: Variables = {
	C_m: {
		desc: "Cost of sending and receiving an object migration",
		defaultValue: 1
	},
	C_c: {
		desc: "Cost of sending and receiving an aura creation",
		defaultValue: 1
	},
	C_u: {
		desc: "Cost of sending and receiving an aura update",
		defaultValue: 1
	},
	C_d: {
		desc: "Cost of sending and receiving an aura deletion",
		defaultValue: 1
	},
	C_i: {
		desc: "Cost of number of objects out of host region (islands)",
		defaultValue: 1
	}
}

export const globalVars: Variables = {
	sigma: {
		type: "count",
		desc: "Number of servers"
	},
	N: {
		type: "count",
		desc: "Total number of objects in the world"
	},
	t: {
		type: "count",
		desc: "Time since boundaries were last moved (seconds)"
	}
}

export const vars: Variables = {
	lambda: {
		type: "proportion",
		desc: "CPU load of the server",
	},
	delta: {
		type: "count",
		desc: "Frame time for the physics simulation step (milliseconds)",
	},
	alpha: {
		type: "proportion",
		desc: "Number of active (awake) objects",
	},
	beta: {
		type: "proportion",
		desc: "Number of objects near a boundary",
	},
	n: {
		type: "count",
		desc: "Number of objects managed by this server",
	}
}

interface VariablesProps {
	boundaries: Array<Boundary>,
	utilConstants: UtilityConstants,
	utilGlobalVars: UtilityVariables,
	onUtilConstantUpdated: UtilConstantUpdatedCallback
}

export const Variables: React.FC<VariablesProps> = (props) => {
	return (
		<div>
			<h5>Constants (click to edit)</h5>
			<Table hover striped size="sm">
				<thead>
					<tr>
						<th>Name</th>
						<th>Value</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
				{ Object.keys(props.utilConstants).map((v, i) =>
					<tr key={i}>
						<td><MathJax.Node>{v}</MathJax.Node></td>
						<ContentEditable html={`${props.utilConstants[v]}`} tagName="td" onChange={ e => props.onUtilConstantUpdated(v, parseFloat(e.target.value.trim())) }/>
						<td>{constants[v].desc}</td>
					</tr>
				) }
				</tbody>
			</Table>

			<h5>Global variables</h5>
			<Table hover striped size="sm">
				<thead>
					<tr>
						<th>Name</th>
						<th>Value</th>
						<th>Type</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
				{ Object.keys(props.utilGlobalVars).map((v, i) =>
					<tr key={i}>
						<td><MathJax.Node>{v}</MathJax.Node></td>
						<td>{props.utilGlobalVars[v].toFixed(2)}</td>
						<td>{globalVars[v].type}</td>
						<td>{globalVars[v].desc}</td>
					</tr>
				) }
				</tbody>
			</Table>

			<h5>Server-local variables</h5>
			<Table hover striped size="sm">
				<thead>
					<tr>
						<th>Name</th>
						<th>Type</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
				{ Object.keys(vars).map((v, i) =>
					<tr key={i}>
						<td><MathJax.Node>{v}</MathJax.Node></td>
						<td>{vars[v].type}</td>
						<td>{vars[v].desc}</td>
					</tr>
				) }
				</tbody>
			</Table>

			<h5>Server-local variable values</h5>
			{ props.boundaries.length > 0 && <Table hover striped size="sm">
				<thead>
					<tr>
						<th>Server</th>
						{ Object.keys(props.boundaries[0].vars).map((v, i) => <th key={i} title={`${vars[v].desc} (${vars[v].type})`}><MathJax.Node>{v}</MathJax.Node></th>) }
					</tr>
				</thead>
				<tbody>
				{ props.boundaries.map((b, i) =>
					<tr key={i}>
						<td>{i}</td>
						{ Object.keys(b.vars).map((v, j) => <td key={j}>{b.vars[v].toFixed(2)}</td>) }
					</tr>
				) }
				</tbody>
			</Table> }
		</div>
	)
}