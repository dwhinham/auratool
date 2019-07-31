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

export default class utilsim extends Component {
	//static whyDidYouRender = true
	constructor(props) {
		super(props)

		this.state = {
			x: 0,
			y: 0,
			showColorPicker: false,
			colorIndex: 0,

			objects: [],
			utilFunctions: [
				{
					expression: "x^2",
					color: colors[0]
				},
				{
					expression: "e^(-10x)",
					color: colors[1]
				},
				{
					expression: "(2x-1)",
					color: colors[2]
				}
			]
		}
	}

	onObjectAdded = (coords) => {
		let objects = [...this.state.objects.slice(), coords]
		this.setState({ objects })
	}

	onObjectDeleted = (e) => {
		let objects = this.state.objects.slice()
		objects.splice(e.currentTarget.dataset.index, 1)
		this.setState({ objects })
	}

	onUtilFunctionInputChanged = (e) => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions[e.currentTarget.dataset.index].expression = e.currentTarget.value
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

	onUtilFunctionDeleted = (e) => {
		if (!e.currentTarget)
			return
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions.splice(e.currentTarget.dataset.index, 1)
		this.setState({ utilFunctions })
	}

	onChangeColorClicked = (e) => {
		this.setState({
			showColorPicker: !this.state.showColorPicker,
			colorIndex: e.currentTarget.dataset.index
		})
	}

	onColorChanged = (color) => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions[this.state.colorIndex].color = color.hex
		this.setState({ utilFunctions })
	}

	onRandomPressed = () => {
		let objects = []
		for (let i = 0; i < 50; ++i) {
			objects.push({
				x: Math.floor(Math.random() * this.props.width),
				y: Math.floor(Math.random() * this.props.height)
			})
		}

		this.setState({ objects })
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
