import React from 'react'

import MathJax from 'react-mathjax2'
import { SketchPicker } from 'react-color'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import Button from 'react-bootstrap/Button'
import ButtonToolbar from 'react-bootstrap/ButtonToolbar'
import Col from 'react-bootstrap/Col'
import Dropdown from 'react-bootstrap/Dropdown'
import FormControl from 'react-bootstrap/FormControl'
import InputGroup from 'react-bootstrap/InputGroup'
import Row from 'react-bootstrap/Row'
import Tab from 'react-bootstrap/Tab'
import Tabs from 'react-bootstrap/Tabs'

import Variables from './variables'

export default function ControlPanel(props) {
	const popover = {
		position: 'absolute',
		top: '2.5rem',
		right: 0,
		zIndex: 200,
	}
	const cover = {
		position: 'fixed',
		top: '0px',
		right: '0px',
		bottom: '0px',
		left: '0px',
	}

	return (
		<Tabs>
			<Tab eventKey="functions" title="Functions">
				<div>
					<Variables boundaries={props.boundaries}/>
					{props.utilFunctions.map((func, i) => {
						return (
							<Row key={i} className="mt-1">
								<Col>
									<InputGroup>
										{
											func.expression && 
											<InputGroup.Prepend>
												<InputGroup.Text>
													<MathJax.Node inline>{`U(${func.utilVar})=${func.expression}`}</MathJax.Node>
												</InputGroup.Text>
											</InputGroup.Prepend>
										}
										<FormControl
											data-index={i}
											placeholder="Function (in ASCIImath)"
											aria-label="Function (in ASCIImath)"
											onChange={props.onUtilFunctionInputUpdated}
											value={func.expression}
										/>
										<InputGroup.Append>
											<Dropdown>
												<Dropdown.Toggle variant="dark" style={{borderRadius: 0}}>
													<MathJax.Node inline>{func.utilVar}</MathJax.Node>
												</Dropdown.Toggle>

												<Dropdown.Menu>											
													<Dropdown.Header>Utility variable</Dropdown.Header>
													<Dropdown.Item onSelect={() => { props.onUtilVarUpdated(i, "x") }}>
														<MathJax.Node inline>x</MathJax.Node>
													</Dropdown.Item>
													<Dropdown.Divider />
													{
														Object.keys(props.vars).map((key, j) => {
															return (
																<Dropdown.Item key={j} onSelect={() => { props.onUtilVarUpdated(i, key) }}>
																	<MathJax.Node>{key}</MathJax.Node>
																</Dropdown.Item>
															)
														})
													}
												</Dropdown.Menu>	
											</Dropdown>

											<Button data-index={i} onClick={props.onChangeColorClicked} style={{backgroundColor: func.color}}><FontAwesomeIcon icon="palette"/></Button>
											{
												props.showColorPicker && parseInt(props.colorIndex) === i &&
												<div style={ popover }>
													<div style={ cover } onClick={ props.onChangeColorClicked }/>
													<SketchPicker disableAlpha={true} color={func.color} onChange={props.onColorUpdated} />
												</div>
											}

											<Button variant="danger" data-index={i} onClick={props.onUtilFunctionDeleted}>
												<FontAwesomeIcon icon="trash"/>
											</Button>
										</InputGroup.Append>
									</InputGroup>
								</Col>
							</Row>
						)
					})}
				</div>
				<Row className="mt-1">
					<Col>
						<Button variant="success" onClick={props.onUtilFunctionAdded}><FontAwesomeIcon icon="plus"/>&nbsp;Add function</Button>
					</Col>
				</Row>
			</Tab>

			<Tab eventKey="boundaries" title="Boundaries">
				<ul>
					{ props.boundaries.map((b, i) => <li key={i}>{`Boundary ${i}: {${b.bounds.min.x}, ${b.bounds.min.y}} => {${b.bounds.max.x}, ${b.bounds.max.y}}`}</li> )}
				</ul>
			</Tab>

			<Tab eventKey="objects" title="Objects">
				<ul>
					{ Object.keys(props.objects).map((o, i) => <li key={i}>{`Object ${i}: id = ${o}, x = ${props.objects[o].x}, y = ${props.objects[o].y}`}</li> )}
				</ul>
			</Tab> */}
		</Tabs>
	)
}