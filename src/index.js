import React, { Component, PureComponent } from 'react'
import ReactDOM from 'react-dom';
import * as d3 from 'd3';

import MathJax from 'react-mathjax2';

import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import ButtonToolbar from 'react-bootstrap/ButtonToolbar'
import Container from 'react-bootstrap/Container';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form'
import FormControl from 'react-bootstrap/FormControl'
import FormGroup from 'react-bootstrap/FormGroup'
import FormLabel from 'react-bootstrap/FormLabel';
import InputGroup from 'react-bootstrap/InputGroup';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';

import Util from './util.js';
import FunctionPlot from './functionplot'

import 'bootstrap/dist/css/bootstrap.css';
import './index.css';

if (process.env.NODE_ENV !== 'production') {
	const whyDidYouRender = require('@welldone-software/why-did-you-render/dist/no-classes-transpile/umd/whyDidYouRender.min.js');
	whyDidYouRender(React);
}

class Server extends PureComponent {
	static whyDidYouRender = true
	constructor(props) {
		super(props)

		this.svgRef = React.createRef();
		this.state = {
			width: props.width,
			height: props.height,
			onObjectAdded: props.onObjectAdded,
			onObjectDeleted: props.onObjectDeleted
		}
	}

	convertCoords = (event) => {
		let x = Util.clamp(event.nativeEvent.offsetX, 0, this.state.width)
		let y = Util.clamp(event.nativeEvent.offsetY, 0, this.state.height)

		return { x: x, y: y }
	}

	clearCanvas = () => {
		this.canvasCtx.clearRect(0, 0, this.state.width, this.state.height)
	}

	componentDidMount = () => {
		let svg = d3.select(this.svgRef.current)

		this.horizontalXHair = svg.append("line")
			.attr("x1", 0)
			.attr("y1", 0)
			.attr("x2", this.state.width)
			.attr("y2", 0)
			.attr("stroke-width", 0.5)
			.attr("stroke-dasharray", "5,5")
			.attr("stroke", "blue")
			.attr("pointer-events", "none")
			.attr("display", "none")

		this.verticalXHair = svg.append("line")
			.attr("x1", 0)
			.attr("y1", 0)
			.attr("x2", 0)
			.attr("y2", this.state.height)
			.attr("stroke-width", 0.5)
			.attr("stroke-dasharray", "5,5")
			.attr("stroke", "blue")
			.attr("pointer-events", "none")
			.attr("display", "none")

		this.coordsLabel = svg.append("text")
			.attr("class", "smallText")
			.attr("x", 0)
			.attr("y", 0)
			.attr("pointer-events", "none")
	}

	onClick = (event) => {
		let coords = this.convertCoords(event)

		if (this.state.onObjectAdded)
			this.state.onObjectAdded(coords)
	}

	onMouseMove = (event) => {
		let { x, y } = this.convertCoords(event)

		this.horizontalXHair.attr("y1", y).attr("y2", y).raise()
		this.verticalXHair.attr("x1", x).attr("x2", x).raise()
		this.coordsLabel.attr("x", x + 5).attr("y", y - 5).text(`${x}, ${y}`).raise()
	}

	onMouseOver = () => {
		// Show crosshair and coords
		this.horizontalXHair.attr("display", "inline")
		this.verticalXHair.attr("display", "inline")
		this.coordsLabel.attr("display", "inline")
	}

	onMouseOut = () => {
		// Hide crosshair and coords
		this.horizontalXHair.attr("display", "none")
		this.verticalXHair.attr("display", "none")
		this.coordsLabel.attr("display", "none")
	}

	render() {
		return (
			<svg
				id="gridCanvas"
				ref={this.svgRef}
				width={this.state.width}
				height={this.state.height}
				onClick={this.onClick}
				onMouseMove={this.onMouseMove}
				onMouseOver={this.onMouseOver}
				onMouseOut={this.onMouseOut}
				xmlns="http://www.w3.org/2000/svg"
			>
				{this.props.objects.map((coords, i) => {
					return (
						<circle
							key={i}
							cx={coords.x}
							cy={coords.y}
							r={10}
							fill="red"
							data-index={i}
							onClick={(e) => {
								this.props.onObjectDeleted(e)
								e.stopPropagation()
							}}
							onMouseOver={(e) => {
								d3.select(e.target)
									.attr("fill", "orange")
									.attr("r", 12)
								//e.stopPropagation()
							}}
							onMouseOut={(e) => {
								d3.select(e.target)
									.attr("fill", "red")
									.attr("r", 10)
							}}
						/>
					)
				})}
			</svg>
		)
	}
}

function ControlPanel(props) {
	return (
		<Tabs>
			<Tab eventKey="functions" title="Functions">
				<MathJax.Context
					input='ascii'
					options={{
						asciimath2jax: {
							useMathMLspacing: true,
							preview: "none",
						}
					}}
				>
					<div>
						{props.utilFunctions.map((func, i) => {
							return (
								<InputGroup className="mb-1" key={i}>
									<InputGroup.Prepend>
										<InputGroup.Text>
											<MathJax.Node inline>{func}</MathJax.Node>
										</InputGroup.Text>
									</InputGroup.Prepend>
									<FormControl
										data-index={i}
										placeholder="Function (in ASCIImath)"
										aria-label="Function (in ASCIImath)"
										onChange={props.onUtilFunctionInputChanged}
										value={func}
									/>
									<InputGroup.Append>
										<Button variant="danger" data-index={i} onClick={props.onUtilFunctionDeleted}>Delete</Button>
									</InputGroup.Append>
								</InputGroup>
							)
						})}
					</div>
				</MathJax.Context>
				<Button onClick={props.onUtilFunctionAdded}>Add</Button>
			</Tab>

			<Tab eventKey="objects" title="Objects">
				<ul>
					{props.objects.map((o, i) => {
						return <li key={i}>{`Object ${i} = x: ${o.x}, y: ${o.y}`}</li>
					})}
				</ul>
			</Tab>

			<Tab eventKey="simulation" title="Simulation">
				<ButtonToolbar>
					<Button className="mr-2" variant="warning" onClick={props.onRandomPressed}>Random</Button>
					<Button className="mr-2" variant="danger" onClick={props.onClearPressed}>Clear</Button>
				</ButtonToolbar>
			</Tab>
		</Tabs>
	)
}

class UtilSim extends Component {
	static whyDidYouRender = true
	constructor(props) {
		super(props)

		this.state = {
			x: 0,
			y: 0,
			objects: [],
			utilFunctions: [
				"x^2",
				"e^(-10x)",
				"(2x-1)"
			]
		}
	}

	onObjectAdded = (coords) => {
		let objects = [...this.state.objects.slice(), coords]
		this.setState({ objects })
	}

	onObjectDeleted = (e) => {
		let objects = this.state.objects.slice()
		objects.splice(e.target.dataset.index, 1)
		this.setState({ objects })
	}

	onUtilFunctionInputChanged = (e) => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions[e.target.dataset.index] = e.target.value
		this.setState({ utilFunctions })
	}

	onUtilFunctionAdded = () => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions.push("")
		this.setState({ utilFunctions })
	}

	onUtilFunctionDeleted = (e) => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions.splice(e.target.dataset.index, 1)
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
					{/* <Nav className="mr-auto">
						<Nav.Link href="#home">Home</Nav.Link>
						<Nav.Link href="#features">Features</Nav.Link>
						<Nav.Link href="#pricing">Pricing</Nav.Link>
					</Nav>
					<Form inline>
						<FormControl type="text" placeholder="Search" className="mr-sm-2" />
						<Button variant="outline-info">Search</Button>
					</Form> */}
				</Navbar>

				{/* <Container fluid="true"> */}
				<Container>
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
							/>
						</Col>
					</Row>
					<Row>
						<FunctionPlot functions={this.state.utilFunctions} />
					</Row>
				</Container>
			</div>
		);
	}
}

ReactDOM.render(<UtilSim width="500" height="500" />, document.getElementById('root'));
