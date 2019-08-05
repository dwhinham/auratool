import React, { Component } from 'react'

import FunctionPlot from './functionplot'
import ControlPanel from './controlpanel'
import Server from './server'

import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';

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

const vars = {
    O_t: {
        value: 0,
        type: "count",
        desc: "Total number of objects on the server.",
    },
    O_a: {
        value: 0,
        type: "proportion",
        desc: "Number of active objects.",
    },
    O_b: {
        value: 0,
        type: "proportion",
        desc: "Number of objects near a boundary.",
    },
    C_l: {
        value: 0,
        type: "proportion",
        desc: "CPU load of the server.",
    },
}

export default class UtilSim extends Component {
	//static whyDidYouRender = true
	constructor(props) {
		super(props)

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
					color: colors[0]
				},
				{
					expression: "event^(-10x)",
					color: colors[1]
				},
				{
					expression: "(2x-1)",
					color: colors[2]
				}
			]
		}
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
		var objects = {}
		event.source.world.bodies.forEach(body => {
			objects[body.id] = { x: body.position.x, y: body.position.y }
		})

		this.setState({objects})
	}

	onUtilFunctionInputChanged = event => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions[event.currentTarget.dataset.index].expression = event.currentTarget.value
		this.setState({ utilFunctions })
	}

	onUtilFunctionAdded = () => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions.push({
			expression: "",
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

	onClearPressed = () => {
		this.setState({ objects: [] })
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
								width={this.props.width}
								height={this.props.height}
								objects={this.state.objects}
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
							<FunctionPlot functions={this.state.utilFunctions} />
						</Col>
					</Row>
				</Container>
			</div>
		);
	}
}
