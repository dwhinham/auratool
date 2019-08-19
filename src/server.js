import React, { PureComponent } from 'react'

import Matter from 'matter-js'

import { round } from 'lodash'

export default class Server extends PureComponent {
	static whyDidYouRender = true
	sleepCount = 0

	constructor(props) {
		super(props)

		this.canvasRef = React.createRef()

		this.state = {
			drawCursor: false
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
				height: 1000,
				background: 'rgb(0, 0, 0, 0)',
				wireframes: false,
			}
		})
		
		Matter.World.add(this.matterEngine.world, this.matterMouseConstraint)

		// Mouse handlers
		Matter.Events.on(this.matterMouseConstraint, 'mouseup', this.onMouseUp)
		Matter.Events.on(this.matterMouseConstraint, 'mousemove', this.onMouseMove)
		Matter.Events.on(this.matterMouseConstraint, 'startdrag', this.onMouseDragStart)
		Matter.Events.on(this.matterMouseConstraint, 'enddrag', this.onMouseDragEnd)

		// Update positions 
		Matter.Events.on(this.matterEngine, 'afterUpdate', this.props.onAfterUpdate)

		// Renderer hooks
		//Matter.Events.on(this.matterRender, 'beforeRender', this.onBeforeRender)
		Matter.Events.on(this.matterRender, 'afterRender', this.onAfterRender)

		// run the engine
		Matter.Engine.run(this.matterEngine)

		// run the renderer
		Matter.Render.run(this.matterRender)
	}

	onAfterRender = event => {
		var ctx = this.canvasCtx

		// Draw grid
		ctx.lineWidth = 1
		ctx.strokeStyle = 'rgb(128, 128, 255, 0.2)'
		ctx.setLineDash([])

		const width = this.canvasRef.current.width
		const height = this.canvasRef.current.height

		const xStep = (width / (this.matterRender.bounds.max.x - this.matterRender.bounds.min.x)) * 50
		const yStep = (height / (this.matterRender.bounds.max.y - this.matterRender.bounds.min.y)) * 50

		for (var x = 0; x < width; x += xStep) {
			ctx.beginPath()
			ctx.moveTo(x + 0.5, 0)
			ctx.lineTo(x + 0.5, height)
			ctx.stroke()
		}

		for (var y = 0; y < height; y += yStep) {
			ctx.beginPath()
			ctx.moveTo(0, y + 0.5)
			ctx.lineTo(width, y + 0.5)
			ctx.stroke()
		}

		// Draw crosshairs
		if (!this.state.drawCursor || !this.state.mouse)
			return

		ctx.strokeStyle = 'black'
		ctx.setLineDash([5, 8])
		ctx.beginPath()
		ctx.moveTo(this.state.mouse.absolute.x + 0.5, 0)
		ctx.lineTo(this.state.mouse.absolute.x + 0.5, height)
		ctx.stroke()

		ctx.beginPath()
		ctx.moveTo(0, this.state.mouse.absolute.y + 0.5)
		ctx.lineTo(width, this.state.mouse.absolute.y + 0.5)
		ctx.stroke()

		// Draw coordinates
		ctx.fillStyle = "black"
		ctx.fillText(`${round(this.state.mouse.position.x, 2)}, ${round(this.state.mouse.position.y, 2)}`, this.state.mouse.absolute.x + 10, this.state.mouse.absolute.y - 10)
	}

	onMouseDragStart = event => {
		this.setState({ dragStartPosition: Object.assign({}, event.mouse.position) })
	}

	onMouseDragEnd = event => {
		const oldPos = this.state.dragStartPosition
		const newPos = event.mouse.position

		// Clicked on an object without dragging - delete it
		if (oldPos.x === newPos.x && oldPos.y === newPos.y) {
			this.props.onObjectDeleted(event.body.id)
			Matter.Composite.remove(this.matterEngine.world, event.body)
		}
	}

	onMouseUp = event => {
		// Just finished dragging, bail out
		if (this.state.dragStartPosition) {
			this.setState({dragStartPosition: null})
			return
		}

		const mousePos = event.mouse.position
			
		// Add new object
		const body = Matter.Bodies.circle(mousePos.x, mousePos.y, 10, { restitution: 0.5 })

		Matter.Events.on(body, 'sleepStart', event => {
			//this.sleepCount--
			//console.log(this.sleepCount)
		})

		Matter.Events.on(body, 'sleepEnd', event => {
			//this.sleepCount++
			//console.log(this.sleepCount)
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
		this.setState({ drawCursor: true })
	}

	onMouseOut = event => {
		// Hide crosshair and coords
		this.setState({ drawCursor: false })
	}

	onWheel = event => {
		const step = 50
		const zoom = event.deltaY < 0 ? -step : step

		var maxX = this.matterRender.bounds.max.x + zoom
		var maxY = this.matterRender.bounds.max.y + zoom

		// Clamp to at least 50
		maxX = Math.max(step, maxX)
		maxY = Math.max(step, maxY)

		Matter.Render.lookAt(this.matterRender, {
			bounds: {
				min: { x: 0, y : 0 },
				max: {
					x: maxX,
					y: maxY
				}
			}
		}, null, true)
	}

	spawnRandomObjects = count => {
		var bodies = []
		for (var i = 0; i < count; ++i) {
			var x = Math.random() * this.matterRender.bounds.max.x
			var y = Math.random() * this.matterRender.bounds.max.y
			bodies.push(Matter.Bodies.circle(x, y, 10, { restitution: 0.5 }))
		}

		Matter.World.add(this.matterEngine.world, bodies)
	}

	clearAllObjects = () => {
		// Remove the bodies
		Matter.World.clear(this.matterEngine.world)

		// Re-add mouse constraint
		Matter.World.add(this.matterEngine.world, this.matterMouseConstraint)
	}

	render() {
		return (
			<canvas
				id="gridCanvas"
				//width="100%"
				//height="100%"
				ref={this.canvasRef}
				onMouseOver={this.onMouseOver}
				onMouseOut={this.onMouseOut}
				onWheel={this.onWheel}
			/>
		)
	}
}
