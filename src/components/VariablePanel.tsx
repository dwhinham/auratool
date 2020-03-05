///<reference path="../types/types.d.ts" />

import * as React from 'react'

import MathJax from 'react-mathjax2'
import Table from 'react-bootstrap/Table'

import ContentEditable from 'react-contenteditable'

import { constants, globalVars, localVars } from '../Variables'

interface VariablePanelProps {
	boundaries: Array<Boundary>,
	utilConstants: UtilityConstants,
	utilGlobalVars: UtilityVariables,
	onUtilConstantUpdated: UtilConstantUpdatedCallback
}

export const VariablePanel: React.FC<VariablePanelProps> = (props) => {
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
				{ Object.keys(localVars).map((v, i) =>
					<tr key={i}>
						<td><MathJax.Node>{v}</MathJax.Node></td>
						<td>{localVars[v].type}</td>
						<td>{localVars[v].desc}</td>
					</tr>
				) }
				</tbody>
			</Table>

			<h5>Server-local variable values</h5>
			{ props.boundaries.length > 0 && <Table hover striped size="sm">
				<thead>
					<tr>
						<th>Server</th>
						{ Object.keys(props.boundaries[0].vars).map((v, i) => <th key={i} title={`${localVars[v].desc} (${localVars[v].type})`}><MathJax.Node>{v}</MathJax.Node></th>) }
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