import React, { PureComponent } from 'react'

import Matter from 'matter-js'

export default class Server extends PureComponent {
	static whyDidYouRender = true

	constructor(props) {
		super(props)

		this.canvasRef = React.createRef()
		this.state = {
			width: props.width,
			height: props.height
		}

		// Create a physics engine
		this.matterEngine = Matter.Engine.create({
			enableSleeping: true
		})

		// Top-down, so no gravity
		this.matterEngine.world.gravity.x = 0
		this.matterEngine.world.gravity.y = 0
	}

	componentDidMount = () => {
		// Get canvas context and set it up
		this.canvasCtx = this.canvasRef.current.getContext("2d")
		this.canvasCtx.font = "12px Arial"

		// Add mouse control
		this.matterMouse = Matter.Mouse.create(this.canvasRef.current)
		this.matterMouseConstraint = Matter.MouseConstraint.create(this.matterEngine, {
            mouse: this.matterMouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false
                }
            }
		})

		// Create a renderer
		this.matterRender = Matter.Render.create({
			canvas: this.canvasRef.current,
			engine: this.matterEngine,
			mouse: this.matterMouse,
			options: {
				//mouse: this.matterMouse,
				width: this.state.width,
				height: this.state.height,
				background: 'rgb(0, 0, 0, 0)',
				wireframes: false,
			}
		})
		
		Matter.World.add(this.matterEngine.world, this.matterMouseConstraint)


		// Mouse handlers
		Matter.Events.on(this.matterMouseConstraint, 'mouseup', this.onMouseUp)
		Matter.Events.on(this.matterMouseConstraint, 'mousemove', this.onMouseMove)

		// Update positions 
		Matter.Events.on(this.matterEngine, 'afterUpdate', this.props.onAfterUpdate)

		// Renderer hooks
		Matter.Events.on(this.matterRender, 'beforeRender', this.onBeforeRender)
		Matter.Events.on(this.matterRender, 'afterRender', this.onAfterRender)

		// run the engine
		Matter.Engine.run(this.matterEngine)

		// run the renderer
		Matter.Render.run(this.matterRender)
	}

	onBeforeRender = event => {

	}

	onAfterRender = event => {
		if (!this.state.drawCursor)
			return
	
		var ctx = this.canvasCtx

		// Draw crosshairs
		ctx.lineWidth = 1
		ctx.setLineDash([5, 8])
		ctx.beginPath()
		ctx.moveTo(this.state.mouse.absolute.x + 0.5, 0)
		ctx.lineTo(this.state.mouse.absolute.x + 0.5, this.state.height)
		ctx.stroke()

		ctx.beginPath()
		ctx.moveTo(0, this.state.mouse.absolute.y + 0.5)
		ctx.lineTo(this.state.width, this.state.mouse.absolute.y + 0.5)
		ctx.stroke()

		// Draw coordinates
		ctx.fillStyle = "black"
		ctx.fillText(`${this.state.mouse.position.x}, ${this.state.mouse.position.y}`, this.state.mouse.absolute.x + 10, this.state.mouse.absolute.y - 10)
	}

	onMouseDragStart = event => {
		this.setState({mouseDragging: true})
	}

	onMouseDragEnd = event => {
		this.setState({mouseDragging: false})
	}

	onMouseUp = event => {
		var mousePosition = event.mouse.position
		var bodies = Matter.Query.point(this.matterEngine.world.bodies, Matter.Vector.create(mousePosition.x, mousePosition.y))

		if (bodies.length) {
			//this.props.onObjectDeleted(bodies[0].id)
			//Matter.Composite.remove(this.matterEngine.world, bodies[0])
			//return
		}

		var body = Matter.Bodies.circle(mousePosition.x, mousePosition.y, 10, { restitution: 0.5 })

		Matter.Events.on(body, 'sleepStart', event => {
			//console.log("sleep start")
		})

		Matter.Events.on(body, 'sleepEnd', event => {
			//console.log(event)
		})

		Matter.World.add(this.matterEngine.world, body)
		this.props.onObjectAdded(body)
	}

	onMouseMove = event => {
		this.setState({
			mouse: { 
				absolute: event.mouse.absolute,
				position: event.mouse.position
			}
		})
	}

	onMouseOver = event => {
		// Show crosshair and coords
		this.setState({drawCursor: true})
	}

	onMouseOut = event => {
		// Hide crosshair and coords
		this.setState({drawCursor: false})
	}

	onWheel = event => {
		const maxX = this.matterRender.bounds.max.x
		const maxY = this.matterRender.bounds.max.y
		const step = (event.deltaY < 0 ? -1 : 1) * 0.2 * this.matterRender.bounds.max.x

		Matter.Render.lookAt(this.matterRender, {
			bounds: {
				min: { x: 0, y : 0 },
				max: { x: maxX + step, y: maxY + step }
			}
		}, null, true)
	}

	render() {
		return (
			<canvas
				id="gridCanvas"
				ref={this.canvasRef}
				onMouseOver={this.onMouseOver}
				onMouseOut={this.onMouseOut}
				onWheel={this.onWheel}
			/>
		)
	}
}
