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
			boundaries: [],

			vars: vars,
			utilFunctions: [
				{
					expression: "x^2",
					plotVar: "x",
					color: colors[0]
				},
				{
					expression: "e^(-10O_a)",
					plotVar: "O_a",
					color: colors[1]
				},
				{
					expression: "O_b",
					plotVar: "O_b",
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
		const numObjects = event.source.world.bodies.length
		var numActive = numObjects

		event.source.world.bodies.forEach(body => {
			//objects[body.id] = { x: body.position.x, y: body.position.y }
			if (body.isSleeping)
				numActive--
		})

		var vars = Object.assign({}, this.state.vars)

		// Update vars
		vars.O_t.value = numObjects
		vars.O_a.value = numObjects ? numActive / numObjects : 0

		this.setState({ vars })

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

		console.log(`new boundary: {${bounds.min.x}, ${bounds.min.y}} -> {${bounds.max.x}, ${bounds.max.y}}`)
		var boundaries = this.state.boundaries.slice()
		boundaries.push({
			bounds: bounds,
			color: colors[boundaries.length % colors.length]
		})
		this.setState({ boundaries })
	}

	onBoundaryDeleted = index => {
		var boundaries = this.state.boundaries.slice()
		boundaries.splice(index, 1)
		this.setState({boundaries})
	}

	onBoundaryUpdated = (index, bounds) => {
		if (!this.validateBoundary(bounds, index))
			return
		console.log(`updating boundary index ${index} to {${bounds.min.x}, ${bounds.min.y}} -> {${bounds.max.x}, ${bounds.max.y}}`)

		var boundaries = this.state.boundaries.slice()
		if (!boundaries[index]) {
			console.log("erm")
			return
		}

		const oldBounds = boundaries[index].bounds
		oldBounds.min.x = bounds.min.x
		oldBounds.min.y = bounds.min.y
		oldBounds.max.x = bounds.max.x
		oldBounds.max.y = bounds.max.y
		this.setState({boundaries})
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

	onUtilFunctionPlotVarChanged = (index, plotVar) => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions[index].plotVar = plotVar
		this.setState({ utilFunctions })
	}

	onUtilFunctionAdded = () => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions.push({
			expression: "",
			plotVar: "x",
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
											<Button size="sm" onClick={this.onHomeClicked}><FontAwesomeIcon icon="home"></FontAwesomeIcon></Button>
										</ButtonGroup>
										<ButtonGroup className="mr-2">
											<Button size="sm" active={this.state.mouseMode === MouseMode.PAN} onClick={() => { this.setState({mouseMode: MouseMode.PAN })}}>
												<FontAwesomeIcon icon="arrows-alt"></FontAwesomeIcon>
											</Button>
											<Button size="sm" active={this.state.mouseMode === MouseMode.BOUNDARY_EDIT} onClick={() => { this.setState({mouseMode: MouseMode.BOUNDARY_EDIT })}}>
												<FontAwesomeIcon icon="border-all"></FontAwesomeIcon>
											</Button>
											<Button size="sm" active={this.state.mouseMode === MouseMode.SNOOKER} onClick={() => { this.setState({mouseMode: MouseMode.SNOOKER })}}>
												<FontAwesomeIcon icon="bowling-ball"></FontAwesomeIcon>
											</Button>
										</ButtonGroup>
										<ButtonGroup>
										<Button size="sm" active={this.state.snapToGrid} onClick={() => { this.setState({snapToGrid: !this.state.snapToGrid })}}>
												<FontAwesomeIcon icon="magnet"></FontAwesomeIcon>
											</Button>
											<Button size="sm" onClick={() => { this.setState({gridSize: Math.max(25, this.state.gridSize - 25)})}}>
												<FontAwesomeIcon icon="th"></FontAwesomeIcon>
											</Button>
											<Button size="sm" onClick={() => { this.setState({gridSize: this.state.gridSize + 25})}}>
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
								functions={this.state.utilFunctions}
								vars={this.state.vars}
							/>
						</Col>
						<Col>
							<ControlPanel
								// Physics state
								boundaries={this.state.boundaries}
								objects={this.state.objects}
								vars={this.state.vars}
								utilFunctions={this.state.utilFunctions}

								// Control panel callbacks
								onUtilFunctionInputChanged={this.onUtilFunctionInputChanged}
								onUtilFunctionPlotVarChanged={this.onUtilFunctionPlotVarChanged}
								onUtilFunctionAdded={this.onUtilFunctionAdded}
								onUtilFunctionDeleted={this.onUtilFunctionDeleted}
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
