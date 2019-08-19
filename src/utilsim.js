import React, { Component } from 'react'

import evaluatex from 'evaluatex/dist/evaluatex';
import FunctionPlot from './functionplot'
import ControlPanel from './controlpanel'
import Server from './server'

import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';
import { vars } from './variables'

const colors = [
	"#001f3f",
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
	"#DDDDDD"
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

			vars: vars,
			objects: {},
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
							<Server
								ref={this.serverRef}
								//objects={this.state.objects}
								onObjectAdded={this.onObjectAdded}
								onObjectDeleted={this.onObjectDeleted}
								onAfterUpdate={this.onAfterUpdate}
							/>
						</Col>
						<Col>
							<ControlPanel
								x={this.state.x}
								y={this.state.y}
								objects={this.state.objects}
								utilFunctions={this.state.utilFunctions}
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
								vars={this.state.vars}
							/>
						</Col>
						<Col>
							<FunctionPlot
								functions={this.state.utilFunctions}
								vars={this.state.vars}
							/>
						</Col>
					</Row>
				</Container>
			</div>
		);
	}
}
