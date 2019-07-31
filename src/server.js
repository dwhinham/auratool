import React, { PureComponent } from 'react'
import * as d3 from 'd3';
import Util from './util.js';

export default class Server extends PureComponent {
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
