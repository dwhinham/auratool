import { cloneDeep } from 'lodash'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import evaluatex from 'evaluatex/dist/evaluatex';
import Matter from 'matter-js'
import React, { Component } from 'react'

import Button from 'react-bootstrap/Button'
import ButtonToolbar from 'react-bootstrap/ButtonToolbar'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';

import { boundsOverlap, pointInBounds, pointNearBounds } from './util'
import { constants } from './variables'
import ControlPanel from './controlpanel'
import FunctionPlot from './functionplot'
import Server, { MouseMode } from './server'

const colors = [
	'#e6194b',
	'#3cb44b',
	'#4363d8',
	'#f58231',
	'#911eb4',
	'#46f0f0',
	'#f032e6',
	'#bcf60c',
	'#fabebe',
	'#008080',
	'#e6beff',
	'#9a6324',
	'#fffac8',
	'#800000',
	'#aaffc3',
	'#808000',
	'#ffd8b1',
	'#000075',
	'#808080',
	'#ffe119',
	'#ffffff',
	'#000000'
]

const A_VERY_BIG_NUMBER = 100000

export default class UtilSim extends Component {
	//static whyDidYouRender = true
	constructor(props) {
		super(props)

		this.serverRef = React.createRef()

		const defaultConstantValues = {}
		Object.keys(constants).forEach(key => defaultConstantValues[key] = constants[key].defaultValue)

		this.frameTimeHistory = new Array(10)

		this.state = {
			x: 0,
			y: 0,
			showColorPicker: false,
			colorIndex: 0,
			lastBoundaryMoveTime: window.performance.now(),

			mouseMode: MouseMode.OBJECT,
			gridSize: 50,
			snapToGrid: false,

			boundaries: [
				{
					bounds: { min: {x: 0, y: -A_VERY_BIG_NUMBER}, max: {x: A_VERY_BIG_NUMBER, y: 0} },
					color: colors[0],
					vars: {}
				},
				{
					bounds: { min: {x: 0, y: 0}, max: {x: A_VERY_BIG_NUMBER, y: A_VERY_BIG_NUMBER} },
					color: colors[1],
					vars: {}
				},
				{
					bounds: { min: {x: -A_VERY_BIG_NUMBER, y: -0}, max: {x: 0, y: A_VERY_BIG_NUMBER} },
					color: colors[2],
					vars: {}
				},
				{
					bounds: { min: {x: -A_VERY_BIG_NUMBER, y: -A_VERY_BIG_NUMBER}, max: {x: 0, y: 0} },
					color: colors[3],
					vars: {}
				}
			],

			utilFunctions: [
				{
					expression: "e^(-10alpha)",
					utilVar: "alpha",
					color: colors[5]
				},
				{
					expression: "e^(-5beta)",
					utilVar: "beta",
					color: colors[6]
				},
				{
					expression: "min(max(0, -log(delta, 1000/60)), 1)",
					utilVar: "delta",
					color: colors[7]
				}
			],
			utilConstants: defaultConstantValues,
			utilGlobalVars: {},
			utilServer: {
				expression: "U_alpha + U_beta + U_delta"
			}
		}
	}

	componentDidMount = () => {
		// Try to compile the functions
		this.state.utilFunctions.forEach((func, i) => this.onUtilFunctionUpdated(i, func.expression))
		this.onServerUtilFunctionUpdated(this.state.utilServer.expression)
			}

	onEngineBeforeUpdate = event => {
		this.lastFrameTime = window.performance.now()
	}

	onEngineAfterUpdate = event => {
		// Update timing metrics
		const now = window.performance.now()
		const delta = (now - this.lastFrameTime)
		this.frameTimeHistory.push(delta)
		this.frameTimeHistory.shift()
		const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length

		const boundaries = this.state.boundaries.slice()
		const allBodies = Matter.Composite.allBodies(event.source.world)
		const totalObjects = allBodies.length

		// Update boundary-local vars
		boundaries.forEach(b => {
			var numObjects = 0
			var numNearBoundary = 0
			var numActive = 0

			var i = 0
			while (i < allBodies.length) {
				const body = allBodies[i]
				if (!pointInBounds(body.position, b.bounds, true)) {
					++i
					continue
				}

				// Update counters
				++numObjects

				// Is it active?
				if (!body.isSleeping)
					++numActive

				// Is the object near any of the boundary edges?
				if (pointNearBounds(body.position, body.circleRadius, b.bounds))
					++numNearBoundary

				// Make object same colour as boundary that contains it
				body.render.fillStyle = b.color

				// Remove from 'all objects array'
				allBodies.splice(i, 1)
			}

			// Fake CPU usage (we can't get real CPU usage in JS)
			b.vars.lambda = (numObjects ? Math.min(1.0, numActive / totalObjects) : 0) + Math.random() * 0.1
			b.vars.delta = avgFrameTime
			b.vars.alpha = numObjects ? numActive / numObjects : 0
			b.vars.beta = numObjects ? numNearBoundary / numObjects : 0 
			b.vars.n = numObjects
		})

		// Color remaining bodies (not in any boundary, which is something that should never happen) black
		allBodies.forEach(b => b.render.fillStyle = 'black')

		// Update global vars
		const timeSinceBoundaryMoved = (now - this.state.lastBoundaryMoveTime) / 1000
		const utilGlobalVars = {
			sigma: boundaries.length,
			t: timeSinceBoundaryMoved,
			N: totalObjects
		}
					
		this.setState({ boundaries, utilGlobalVars })
	}
	
	// Validate the bounds
	validateBoundary = (bounds, boundaryToIgnore = undefined) => {
		// Reject min == max
		if (bounds.min.x === bounds.max.x || bounds.min.y === bounds.max.y)
			return false

		// Reject overlapping boundaries
		return this.state.boundaries.every(boundary => {
			// Prevent comparison against self
			if (boundary === boundaryToIgnore)
				return true

			// Check it doesn't overlap
			return !boundsOverlap(bounds, boundary.bounds)
		})
	}

	onBoundaryAdded = bounds => {
		if (!this.validateBoundary(bounds))
			return

		var boundaries = this.state.boundaries.slice()
		boundaries.push({
			bounds: bounds,
			color: colors[boundaries.length % colors.length],
			vars: {}
		})
		this.setState({ boundaries, lastBoundaryMoveTime: window.performance.now() })
	}

	onBoundaryDeleted = boundary => {
		const index = this.state.boundaries.findIndex(b => b === boundary)
		if (index === -1)
			return

		var boundaries = this.state.boundaries.slice()
		boundaries.splice(index, 1)
		this.setState({ boundaries, lastBoundaryMoveTime: window.performance.now() })
	}

	onBoundaryUpdated = (boundary, bounds, validate = true) => {
		if (validate && !this.validateBoundary(bounds, boundary))
			return

		const index = this.state.boundaries.findIndex(b => b === boundary)
		if (index === -1)
			return

		const boundaries = this.state.boundaries.slice()

		const oldBounds = boundaries[index].bounds
		oldBounds.min.x = bounds.min.x
		oldBounds.min.y = bounds.min.y
		oldBounds.max.x = bounds.max.x
		oldBounds.max.y = bounds.max.y
		this.setState({ boundaries, lastBoundaryMoveTime: window.performance.now() })
	}

	onUtilFunctionUpdated = (index, value) => {
		const utilFunctions = this.state.utilFunctions.slice()
		utilFunctions[index].expression = value

		// Try to compile the function
		try {
			utilFunctions[index].evalFunc = evaluatex(value, { e: Math.E, pi: Math.PI })
		} catch {
			utilFunctions[index].evalFunc = null
		}

		this.setState({ utilFunctions })
	}

	onServerUtilFunctionUpdated = value => {
		const utilServer = cloneDeep(this.state.utilServer)
		utilServer.expression = value

		// Try to compile the function
		try {
			utilServer.evalFunc = evaluatex(value, { e: Math.E, pi: Math.PI })
		} catch {
			utilServer.evalFunc = null
		}

		this.setState({ utilServer })
	}

	onUtilConstantUpdated = (key, value) => {
		const utilConstants = cloneDeep(this.state.utilConstants)
		utilConstants[key] = value
		this.setState({ utilConstants })
	}

	onUtilVarUpdated = (index, utilVar) => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions[index].utilVar = utilVar
		this.setState({ utilFunctions })
	}

	onUtilFunctionAdded = () => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions.push({
			expression: "",
			utilVar: "x",
			color: colors[utilFunctions.length % colors.length]
		})
		this.setState({ utilFunctions })
	}

	onUtilFunctionDeleted = index => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions.splice(index, 1)
		this.setState({ utilFunctions })
	}

	onChangeColorClicked = index => {
		this.setState({
			showColorPicker: !this.state.showColorPicker,
			colorIndex: !this.state.showColorPicker ? index : null
		})
	}

	onColorUpdated = color => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions[this.state.colorIndex].color = color.hex
		this.setState({ utilFunctions })
	}

	onRandomClicked = () => {
		this.serverRef.current.spawnRandomObjects(100)
	}

	onClearClicked = () => {
		this.serverRef.current.clearAllObjects()
	}

	onHomeClicked = () => {
		this.serverRef.current.resetView()
	}

	onShowAllObjectsClicked = () => {
		this.serverRef.current.showAllObjects()
	}

	render() {
		return (
			<div>
				<Navbar bg="dark" variant="dark">
					<Navbar.Brand href="#home">
						Aura Projection - Utility Function Simulator
					</Navbar.Brand>
				</Navbar>

				<Container fluid={true} className="mt-2">
					<Row>
						<Col>
							<Row>
								<Col>
									<ButtonToolbar className="mb-2">
										<ButtonGroup className="mr-2">
											<Button size="sm" variant="secondary" title="Object mode" active={this.state.mouseMode === MouseMode.OBJECT} onClick={() => { this.setState({mouseMode: MouseMode.OBJECT })}}>
												<FontAwesomeIcon icon="cube"></FontAwesomeIcon>
											</Button>
											<Button size="sm" variant="secondary" title="Boundary mode" active={this.state.mouseMode === MouseMode.BOUNDARY_EDIT} onClick={() => { this.setState({mouseMode: MouseMode.BOUNDARY_EDIT })}}>
												<FontAwesomeIcon icon="vector-square"></FontAwesomeIcon>
											</Button>
											<Button size="sm" variant="secondary" title="Snooker mode" active={this.state.mouseMode === MouseMode.SNOOKER} onClick={() => { this.setState({mouseMode: MouseMode.SNOOKER })}}>
												<FontAwesomeIcon icon="bowling-ball"></FontAwesomeIcon>
											</Button>
										</ButtonGroup>
										<ButtonGroup className="mr-2">
											<Button size="sm" variant="secondary" title="Reset view" onClick={this.onHomeClicked}><FontAwesomeIcon icon="home"></FontAwesomeIcon></Button>
											<Button size="sm" variant="secondary" title="Show all objects" onClick={this.onShowAllObjectsClicked}><FontAwesomeIcon icon="eye"></FontAwesomeIcon></Button>
										</ButtonGroup>
										<ButtonGroup className="mr-2">
											<Button size="sm" variant="secondary" title="Toggle snap to grid" active={this.state.snapToGrid} onClick={() => { this.setState({snapToGrid: !this.state.snapToGrid })}}>
												<FontAwesomeIcon icon="magnet"></FontAwesomeIcon>
											</Button>
											<Button size="sm" variant="secondary" title="Decrease grid size" onClick={() => { this.setState({gridSize: Math.max(25, this.state.gridSize / 2)}) }}>
												<FontAwesomeIcon icon="th"></FontAwesomeIcon>
											</Button>
											<Button size="sm" variant="secondary" title="Increase grid size" onClick={() => { this.setState({gridSize: this.state.gridSize * 2}) }}>
												<FontAwesomeIcon icon="th-large"></FontAwesomeIcon>
											</Button>
										</ButtonGroup>
										<ButtonGroup className="mr-2">
											<Button size="sm" variant="secondary" title="Spawn random objects" onClick={this.onRandomClicked}><FontAwesomeIcon icon="dice"></FontAwesomeIcon></Button>
											<Button size="sm" variant="warning" title="Remove all objects" onClick={this.onClearClicked}><FontAwesomeIcon icon="radiation"></FontAwesomeIcon></Button>
										</ButtonGroup>
									</ButtonToolbar>
								</Col>
							</Row>
							<Row>
								<Col>
									<Server
										ref={this.serverRef}
										boundaries={this.state.boundaries}
										//objects={this.state.objects}

										// State
										gridSize={this.state.gridSize}
										mouseMode={this.state.mouseMode}
										snapToGrid={this.state.snapToGrid}

										// Callbacks
										onBoundaryAdded={this.onBoundaryAdded}
										onBoundaryUpdated={this.onBoundaryUpdated}
										onBoundaryDeleted={this.onBoundaryDeleted}

										onEngineBeforeUpdate={this.onEngineBeforeUpdate}
										onEngineAfterUpdate={this.onEngineAfterUpdate}
									/>
								</Col>
							</Row>
						</Col>
						<Col>
							<FunctionPlot
								boundaries={this.state.boundaries}
								utilFunctions={this.state.utilFunctions}
								utilConstants={this.state.utilConstants}
								utilGlobalVars={this.state.utilGlobalVars}
							/>
						</Col>
						<Col>
							<ControlPanel
								// Physics state
								boundaries={this.state.boundaries}
								objects={this.serverRef.current ? this.serverRef.current.matterEngine.world.bodies : null}

								// Utility state
								utilFunctions={this.state.utilFunctions}
								utilConstants={this.state.utilConstants}
								utilGlobalVars={this.state.utilGlobalVars}
								utilServer={this.state.utilServer}

								// Control panel callbacks
								onUtilFunctionUpdated={this.onUtilFunctionUpdated}
								onUtilFunctionAdded={this.onUtilFunctionAdded}
								onUtilFunctionDeleted={this.onUtilFunctionDeleted}
								onServerUtilFunctionUpdated={this.onServerUtilFunctionUpdated}
								onUtilConstantUpdated={this.onUtilConstantUpdated}
								onUtilVarUpdated={this.onUtilVarUpdated}
								onChangeColorClicked={this.onChangeColorClicked}
								onColorUpdated={this.onColorUpdated}
								showColorPicker={this.state.showColorPicker}
								colorIndex={this.state.colorIndex}
							/>
						</Col>
					</Row>
				</Container>
			</div>
		);
	}
}
