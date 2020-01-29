///<reference path="./types/types.d.ts" />

import * as React from 'react'

import MathJax from 'react-mathjax2'
import * as ReactColor from 'react-color'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import Button from 'react-bootstrap/Button'
import Dropdown from 'react-bootstrap/Dropdown'
import FormControl from 'react-bootstrap/FormControl'
import InputGroup from 'react-bootstrap/InputGroup'
import Tab from 'react-bootstrap/Tab'
import Table from 'react-bootstrap/Table'
import Tabs from 'react-bootstrap/Tabs'

import { evaluateServerUtilFunction } from './util'
import { vars, Variables } from './variables'

interface ControlPanelProps {
	showColorPicker: boolean,
	colorIndex?: number,
	onChangeColorClicked: ChangeColorClickedCallback,
	onColorUpdated: ColorUpdatedCallback,

	boundaries: Array<Boundary>,
	utilServer: UtilityFunction,
	utilFunctions: Array<SubUtilityFunction>,
	utilConstants: UtilityVariables,
	utilGlobalVars: UtilityVariables,
	onUtilFunctionAdded: UtilFuncAddedCallback,
	onUtilFunctionDeleted: UtilFuncDeletedCallback,
	onUtilFunctionUpdated: UtilFuncExpressionUpdatedCallback,
	onServerUtilFunctionUpdated: ServerUtilFuncExpressionUpdatedCallback,
	onUtilVarUpdated: UtilFuncVarUpdatedCallback,
	onUtilConstantUpdated: UtilConstantUpdatedCallback
}

export const ControlPanel: React.FC<ControlPanelProps> = (props) => {
	const popover: React.CSSProperties = {
		position: 'absolute',
		top: '2.5rem',
		right: 0,
		zIndex: 200,
	}
	const cover: React.CSSProperties = {
		position: 'fixed',
		top: '0px',
		right: '0px',
		bottom: '0px',
		left: '0px',
	}

	const serverUtilValues = props.boundaries.map(b =>
		evaluateServerUtilFunction(props.utilServer, props.utilFunctions, b, props.utilConstants, props.utilGlobalVars)
	)
	const globalUtilValue = serverUtilValues.length ? serverUtilValues.reduce((a, b) => a + b).toFixed(2) : 0

	return (
		<Tabs id="control-panel">
			<Tab eventKey="variables" title="Variables">
				<Variables boundaries={props.boundaries} utilConstants={props.utilConstants} utilGlobalVars={props.utilGlobalVars} onUtilConstantUpdated={props.onUtilConstantUpdated} />
			</Tab>

			<Tab eventKey="functions" title="Functions">
				<h5>Utility functions</h5>
				{ props.utilFunctions.map((func, i) =>
					<InputGroup className="mb-1" key={i}>
						<InputGroup.Prepend>
							<InputGroup.Text>
								<MathJax.Node inline>{`U_${func.utilVar}=${func.expression}`}</MathJax.Node>
							</InputGroup.Text>
						</InputGroup.Prepend>

						<FormControl
							placeholder="Function (in ASCIImath)"
							aria-label="Function (in ASCIImath)"
							onChange={ (e: React.FormEvent<HTMLInputElement>) => e.currentTarget.value && props.onUtilFunctionUpdated(i, e.currentTarget.value) }
							value={func.expression}
						/>
						<InputGroup.Append>
							<Dropdown>
								<Dropdown.Toggle id={`util-var-dropdown-${i}`} variant="dark" style={{borderRadius: 0}}>
									<MathJax.Node inline>{func.utilVar}</MathJax.Node>
								</Dropdown.Toggle>

								<Dropdown.Menu>
									<Dropdown.Header>Utility variable</Dropdown.Header>
									<Dropdown.Item onSelect={() => { props.onUtilVarUpdated(i, "x") }}>
										<MathJax.Node inline>x</MathJax.Node>
									</Dropdown.Item>
									<Dropdown.Divider />
									{
										Object.keys(vars).map((key, j) =>
											<Dropdown.Item key={j} onSelect={() => { props.onUtilVarUpdated(i, key) }}>
												<MathJax.Node>{key}</MathJax.Node>
											</Dropdown.Item>
										)
									}
								</Dropdown.Menu>
							</Dropdown>

							<Button onClick={() => props.onChangeColorClicked(i)} style={{backgroundColor: func.color}}><FontAwesomeIcon icon="palette"/></Button>
							{
								props.showColorPicker && props.colorIndex === i &&
								<div style={ popover }>
									<div style={ cover } onClick={ () => props.onChangeColorClicked(undefined) }/>
									<ReactColor.SketchPicker disableAlpha={true} color={func.color} onChange={props.onColorUpdated} />
								</div>
							}

							<Button variant="danger" onClick={ () => props.onUtilFunctionDeleted(i) }>
								<FontAwesomeIcon icon="trash"/>
							</Button>
						</InputGroup.Append>
					</InputGroup>
				) }
				<Button className="mb-2" variant="success" onClick={props.onUtilFunctionAdded}><FontAwesomeIcon icon="plus"/>&nbsp;Add function</Button>

				<h5>Local utility</h5>
				<InputGroup className="mb-1">
					<InputGroup.Prepend>
						<InputGroup.Text>
							<MathJax.Node inline>{`U_i=${props.utilServer.expression}`}</MathJax.Node>
						</InputGroup.Text>
					</InputGroup.Prepend>

					<FormControl
						placeholder="Function (in ASCIImath)"
						aria-label="Function (in ASCIImath)"
						onChange={ (e: React.FormEvent<HTMLInputElement>) => e.currentTarget.value && props.onServerUtilFunctionUpdated(e.currentTarget.value) }
						value={props.utilServer.expression}
					/>
				</InputGroup>
				<Table hover striped size="sm">
					<thead>
						<tr>
							<th>Server</th>
							<th><MathJax.Node>U_i</MathJax.Node></th>
						</tr>
					</thead>
					<tbody>
					{ props.boundaries.map((b, i) =>
						<tr key={i}>
							<td>{i}</td>
							<td><MathJax.Node>{ serverUtilValues[i].toFixed(2) }</MathJax.Node></td>
						</tr>
					) }
					</tbody>
				</Table>

				<h5>Global utility</h5>
				<MathJax.Node>U_g = U_0 + U_1 + ... + U_n</MathJax.Node>
				= {globalUtilValue}
			</Tab>

			<Tab eventKey="boundaries" title="Boundaries">
				<Table hover striped size="sm">
					<thead>
						<tr>
							<td>Server</td>
							<td><MathJax.Node>x_1</MathJax.Node></td>
							<td><MathJax.Node>y_1</MathJax.Node></td>
							<td><MathJax.Node>x_2</MathJax.Node></td>
							<td><MathJax.Node>y_2</MathJax.Node></td>
							<td>Width</td>
							<td>Height</td>
						</tr>
					</thead>
					<tbody>
					{ props.boundaries.map((b, i) =>
						<tr key={i}>
							<td>{i}</td>
							<td>{b.bounds.min.x.toFixed(2)}</td>
							<td>{b.bounds.min.y.toFixed(2)}</td>
							<td>{b.bounds.max.x.toFixed(2)}</td>
							<td>{b.bounds.max.y.toFixed(2)}</td>
							<td>{(b.bounds.max.x - b.bounds.min.x).toFixed(2)}</td>
							<td>{(b.bounds.max.y - b.bounds.min.y).toFixed(2)}</td>
						</tr>
					)}
					</tbody>
				</Table>
			</Tab>
		</Tabs>
	)
}

export default ControlPanel