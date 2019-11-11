///<reference path="./types/types.d.ts" />

import { cloneDeep } from 'lodash'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import evaluatex from 'evaluatex/dist/evaluatex'
import Matter from 'matter-js'
import * as React from 'react'

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
import * as ReactColor from 'react-color';

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

interface UtilSimProps {

}

interface UtilSimState {
	showColorPicker: boolean,
	colorIndex?: number,
	lastBoundaryMoveTime: number,
	mouseMode: MouseMode,
	gridSize: number,
	snapToGrid: boolean,
	boundaries: Array<Boundary>,
	utilFunctions: Array<SubUtilityFunction>,
	utilConstants: UtilityVariables,
	utilGlobalVars: UtilityVariables,
	utilServer: UtilityFunction
}

export default class UtilSim extends React.Component<UtilSimProps, UtilSimState> {
	//static whyDidYouRender = true

	serverRef: React.RefObject<Server>
	lastFrameTime: number
	frameTimeHistory: Array<number>

	constructor(props: UtilSimProps) {
		super(props)

		const defaultConstantValues: UtilityVariables = {}
		Object.keys(constants).forEach((key) => defaultConstantValues[key] = constants[key].defaultValue as number)

		this.serverRef = React.createRef()
		this.lastFrameTime = 0
		this.frameTimeHistory = new Array(10)

		this.state = {
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

	onEngineBeforeUpdate = (event: Matter.IEventTimestamped<Matter.Engine>) => {
		this.lastFrameTime = window.performance.now()
	}

	onEngineAfterUpdate = (event: Matter.IEventTimestamped<Matter.Engine>) => {
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
				if (pointNearBounds(body.position, body.circleRadius as number, b.bounds))
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
	validateResize = (resizeInfo: Array<BoundaryResizeInfo>) => {
		// Get the boundaries not being updated
		var notBeingUpdated: Bounds[] = []
		this.state.boundaries.forEach(b => {
			if (!resizeInfo.some(r => r.boundary === b))
				notBeingUpdated.push(b.bounds)
		})

		return resizeInfo.every(info => {
			const bounds = info.newBounds

		// Reject min == max
		if (bounds.min.x === bounds.max.x || bounds.min.y === bounds.max.y)
			return false

			// Combine check list with boundaries being updated
			const checkList = [...notBeingUpdated]
			resizeInfo.forEach(r => (r !== info) && checkList.push(r.newBounds))

			// Reject overlapping boundaries
			return !checkList.some(b => boundsOverlap(bounds, b))
		})
	}

	validateBoundary = (bounds: Bounds, boundaryToIgnore?: Boundary) => {
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

	onBoundaryAdded = (bounds: Bounds) => {
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

	onBoundaryDeleted = (boundary: Boundary) => {
		const index = this.state.boundaries.findIndex(b => b === boundary)
		if (index === -1)
			return

		var boundaries = this.state.boundaries.slice()
		boundaries.splice(index, 1)
		this.setState({ boundaries, lastBoundaryMoveTime: window.performance.now() })
	}

	onBoundariesUpdated = (resizeInfo: Array<BoundaryResizeInfo>, validate: boolean = true) => {
		if (validate && !this.validateResize(resizeInfo))
			return

		const boundaries = this.state.boundaries.slice()
		resizeInfo.forEach(info => {
			// Find the right boundary object to to update
			for (let i = 0; i < boundaries.length; ++i) {
				if (info.boundary === boundaries[i]) {
					const oldBounds = boundaries[i].bounds
					oldBounds.min.x = info.newBounds.min.x
					oldBounds.min.y = info.newBounds.min.y
					oldBounds.max.x = info.newBounds.max.x
					oldBounds.max.y = info.newBounds.max.y
					break
				}
			}
		})

		this.setState({
			boundaries,
			lastBoundaryMoveTime: window.performance.now()
		})
	}

	onUtilFunctionUpdated = (index: number, value: string) => {
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

	onServerUtilFunctionUpdated = (value: string) => {
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

	onUtilConstantUpdated = (key: string, value: number) => {
		const utilConstants = cloneDeep(this.state.utilConstants)
		utilConstants[key] = value
		this.setState({ utilConstants })
	}

	onUtilVarUpdated = (index: number, value: string) => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions[index].utilVar = value
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

	onUtilFunctionDeleted = (index: number) => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions.splice(index, 1)
		this.setState({ utilFunctions })
	}

	onChangeColorClicked = (index?: number) => {
		this.setState({
			showColorPicker: !this.state.showColorPicker,
			colorIndex: !this.state.showColorPicker ? index : undefined
		})
	}

	onColorUpdated = (color: ReactColor.ColorResult) => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions[this.state.colorIndex as number].color = color.hex
		this.setState({ utilFunctions })
	}

	onRandomClicked = () => {
		if (!this.serverRef.current)
			return;
		this.serverRef.current.spawnRandomObjects(100)
	}

	onClearClicked = () => {
		if (!this.serverRef.current)
			return;
		this.serverRef.current.clearAllObjects()
	}

	onHomeClicked = () => {
		if (!this.serverRef.current)
			return;
		this.serverRef.current.resetView()
	}

	onShowAllObjectsClicked = () => {
		if (!this.serverRef.current)
			return;
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
										onBoundariesUpdated={this.onBoundariesUpdated}
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
