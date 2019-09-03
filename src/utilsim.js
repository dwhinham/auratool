import Matter from 'matter-js'
import React, { Component } from 'react'

import evaluatex from 'evaluatex/dist/evaluatex';
import FunctionPlot from './functionplot'
import ControlPanel from './controlpanel'
import Server, { MouseMode } from './server'
import Util from './util'

import Button from 'react-bootstrap/Button'
import ButtonToolbar from 'react-bootstrap/ButtonToolbar'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';
import { vars } from './variables'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const colors = [
	"#0074D9",
	"#7FDBFF",
	"#39CCCC",
	"#3D9970",
	"#2ECC40",
	"#01FF70",
	"#FFDC00",
	"#FF851B",
	"#FF4136",
	"#85144b",
	"#F012BE",
	"#B10DC9",
	"#111111",
	"#AAAAAA",
	"#DDDDDD",
	"#001f3f",
]

const A_VERY_BIG_NUMBER = 100000

export default class UtilSim extends Component {
	//static whyDidYouRender = true
	constructor(props) {
		super(props)

		this.serverRef = React.createRef()

		this.state = {
			x: 0,
			y: 0,
			showColorPicker: false,
			colorIndex: 0,

			mouseMode: MouseMode.OBJECT,
			gridSize: 50,
			snapToGrid: false,

			objects: {},

			boundaries: [
				{
					bounds: { min: {x: 0, y: -A_VERY_BIG_NUMBER}, max: {x: A_VERY_BIG_NUMBER, y: 0} },
					color: "#AA0000",
					vars: {}
				},
				{
					bounds: { min: {x: 0, y: 0}, max: {x: A_VERY_BIG_NUMBER, y: A_VERY_BIG_NUMBER} },
					color: "#00AA00",
					vars: {}
				},
				{
					bounds: { min: {x: -A_VERY_BIG_NUMBER, y: -0}, max: {x: 0, y: A_VERY_BIG_NUMBER} },
					color: "#0000AA",
					vars: {}
				},
				{
					bounds: { min: {x: -A_VERY_BIG_NUMBER, y: -A_VERY_BIG_NUMBER}, max: {x: 0, y: 0} },
					color: "#AAAAAA",
					vars: {}
				}
			],

			utilFunctions: [
				{
					expression: "x^2",
					utilVar: "x",
					color: colors[0]
				},
				{
					expression: "e^(-10O_a)",
					utilVar: "O_a",
					color: colors[1]
				},
				{
					expression: "O_b",
					utilVar: "O_b",
					color: colors[2]
				}
			]
		}

		this.state.utilFunctions.forEach(func => {
			// Try to compile the function
			try {
				func.evalFunc = evaluatex(func.expression)
			} catch {
				func.evalFunc = null
			}
		})
	}

	onObjectAdded = body => {
		this.setState({
			objects: {
				...this.state.objects,
				[body.id]: { x: body.x, y: body.y }
			}
		})
	}

	onObjectDeleted = id => {
		const {[id]: key, ...objects} = this.state.objects
		this.setState({ objects })
	}

	onAfterUpdate = event => {
		// Update vars for each boundary
		const boundaries = this.state.boundaries.slice()

		const allBodies = Matter.Composite.allBodies(event.source.world)
		const totalObjects = allBodies.length

		boundaries.forEach(b => {
			const bodies = []
			var numNearBoundary = 0

			for (var i = 0; i < allBodies.length;) {
				const body = allBodies[i]
				if (Util.pointInBounds(body.position, b.bounds, true)) {
					// Is the object near any of the boundary edges?
					if (Util.objectNearBoundary(body, b.bounds))
						++numNearBoundary

					// Make object same colour as boundary that contains it
					body.render.fillStyle = b.color

					// Add to this boundary's objects array, remove from 'all objects array'
					bodies.push(body)
					allBodies.splice(i, 1)
				} else {
					++i
				}
			}

			const numObjects = bodies.length

			var numActive = numObjects
			bodies.forEach(body => {
				//objects[body.id] = { x: body.position.x, y: body.position.y }
				if (body.isSleeping)
					numActive--
			})

			b.vars.CPU_l = 0
			b.vars.O_a = numObjects ? numActive / numObjects : 0
			b.vars.O_b = numObjects ? numNearBoundary / numObjects : 0 
			b.vars.O_t = numObjects
			b.vars.T_m = 0
		})

		this.setState({ boundaries })

		// this.setState(prevState => {
		// 	return {
		// 		//objects: objects,
		// 		vars: {
		// 			...prevState.vars,
		// 			O_t: {
		// 				...prevState.vars.O_t,import evaluatex from 'evaluatex/dist/evaluatex';
		// 				value: numObjects,
		// 			},
		// 			O_a: {
		// 				...prevState.vars.O_a,
		// 				value: numObjects ? numActive / numObjects : 0,
		// 			},
					
		// 		}
		// 	}
		// })
	}
	
	// Validate the bounds
	validateBoundary = (bounds, indexToIgnore = null) => {
		// Reject min == max
		if (bounds.min.x === bounds.max.x || bounds.min.y === bounds.max.y)
			return false

		// Reject overlapping boundaries
		return this.state.boundaries.every((boundary, i) => {
			// Prevent comparison against self
			if (indexToIgnore !== null && indexToIgnore === i)
				return true

			// Check it doesn't overlap
			return !Util.boundsOverlap(bounds, boundary.bounds)
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
		this.setState({ boundaries })
	}

	onBoundaryDeleted = index => {
		var boundaries = this.state.boundaries.slice()
		boundaries.splice(index, 1)
		this.setState({ boundaries })
	}

	onBoundaryUpdated = (index, bounds) => {
		if (!this.validateBoundary(bounds, index))
			return

		const boundaries = this.state.boundaries.slice()

		const oldBounds = boundaries[index].bounds
		oldBounds.min.x = bounds.min.x
		oldBounds.min.y = bounds.min.y
		oldBounds.max.x = bounds.max.x
		oldBounds.max.y = bounds.max.y
		this.setState({ boundaries })
	}

	onUtilFunctionInputChanged = event => {
		const index = event.currentTarget.dataset.index
		const expression = event.currentTarget.value

		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions[index].expression = expression

		// Try to compile the function
		try {
            utilFunctions[index].evalFunc = evaluatex(expression)
		} catch {
			utilFunctions[index].evalFunc = null
		}

		this.setState({ utilFunctions })
	}

	onUtilVarChanged = (index, utilVar) => {
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

	onUtilFunctionDeleted = event => {
		if (!event.currentTarget)
			return
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions.splice(event.currentTarget.dataset.index, 1)
		this.setState({ utilFunctions })
	}

	onChangeColorClicked = event => {
		this.setState({
			showColorPicker: !this.state.showColorPicker,
			colorIndex: event.currentTarget.dataset.index
		})
	}

	onColorChanged = color => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions[this.state.colorIndex].color = color.hex
		this.setState({ utilFunctions })
	}

	onRandomPressed = () => {
		this.serverRef.current.spawnRandomObjects(100)
	}

	onClearPressed = () => {
		this.setState({ objects: {} })
		this.serverRef.current.clearAllObjects()
	}

	onHomeClicked = () => {
		console.log("home")
	}

	render() {
		return (
			<div>
				<Navbar bg="dark" variant="dark">
					<Navbar.Brand href="#home">
						Aura Projection - Utility Function Simulator
					</Navbar.Brand>
				</Navbar>

				<Container fluid="true" className="mt-2">
					<Row>
						<Col>
							<Row>
								<Col>
									<ButtonToolbar className="mb-2">
										<ButtonGroup className="mr-2">
											<Button size="sm" variant="secondary" title="Show all objects" onClick={this.onHomeClicked}><FontAwesomeIcon icon="home"></FontAwesomeIcon></Button>
										</ButtonGroup>
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
										<ButtonGroup>
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

										onObjectAdded={this.onObjectAdded}
										onObjectDeleted={this.onObjectDeleted}
										onAfterUpdate={this.onAfterUpdate}
									/>
								</Col>
							</Row>
						</Col>
						<Col>
							<FunctionPlot
								boundaries={this.state.boundaries}
								functions={this.state.utilFunctions}
								vars={vars}
							/>
						</Col>
						<Col>
							<ControlPanel
								// Physics state
								boundaries={this.state.boundaries}
								objects={this.state.objects}
								utilFunctions={this.state.utilFunctions}
								vars={vars}

								// Control panel callbacks
								onUtilFunctionInputChanged={this.onUtilFunctionInputChanged}
								onUtilFunctionAdded={this.onUtilFunctionAdded}
								onUtilFunctionDeleted={this.onUtilFunctionDeleted}
								onUtilVarChanged={this.onUtilVarChanged}
								onRandomPressed={this.onRandomPressed}
								onClearPressed={this.onClearPressed}
								onChangeColorClicked={this.onChangeColorClicked}
								onColorChanged={this.onColorChanged}
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
