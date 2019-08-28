import React, { PureComponent } from 'react'
import Matter from 'matter-js'
import { random, round } from 'lodash'

// Custom renderer
const RenderAuraProj = require('./renderauraproj')

export const MouseMode = {
	PAN: 'pan',
	DRAW_BOUNDARY: 'draw_boundary'
}

export default class Server extends PureComponent {
	static whyDidYouRender = true
	sleepCount = 0

	constructor(props) {
		super(props)

		this.canvasRef = React.createRef()

		this.state = {
			drawCursor: false,
			draggingBody: false,
			dragStartPosition: null,
			dragLastPosition: null
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
		const canvas = this.canvasRef.current
		this.canvasCtx = canvas.getContext("2d")
		this.canvasCtx.font = "12px Arial"

		// Fit canvas to container
		// TODO: make this dynamic
		canvas.style.width = "100%"
		canvas.style.height = "100%"
		canvas.width  = canvas.offsetWidth
		canvas.height = canvas.offsetHeight

		// Add mouse control
		this.matterMouse = Matter.Mouse.create(canvas)
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
		this.matterRender = RenderAuraProj.create({
			// Bounds begin centered about the origin
			bounds: {
				min: {
					x: -canvas.width / 2,
					y: -canvas.height / 2
				},
				max: {
					x: canvas.width / 2,
					y: canvas.height / 2
				}
			},
			canvas: canvas,
			engine: this.matterEngine,
			mouse: this.matterMouse,
			options: {
				width: canvas.width,
				height: canvas.height,
				background: 'rgb(0, 0, 0, 0)',
				wireframes: false,
			}
		})
		
		Matter.World.add(this.matterEngine.world, this.matterMouseConstraint)

		// Temp
		for (var x = 0; x < 9; ++x) {
			for (var y = 0; y < 9; ++y) {
				const body = Matter.Bodies.circle(x * 50 - 200, y * 50 - 200, 20, { restitution: 0.5 })
				Matter.World.add(this.matterEngine.world, body)		
			}
		}

		const body = Matter.Bodies.circle(0, 300, 50, { restitution: 0.5 })
		Matter.World.add(this.matterEngine.world, body)	

		// Mouse handlers
		Matter.Events.on(this.matterMouseConstraint, 'mousedown', this.onMouseDown)
		Matter.Events.on(this.matterMouseConstraint, 'mouseup', this.onMouseUp)
		Matter.Events.on(this.matterMouseConstraint, 'mousemove', this.onMouseMove)
		Matter.Events.on(this.matterMouseConstraint, 'startdrag', this.onBodyDragStart)
		Matter.Events.on(this.matterMouseConstraint, 'enddrag', this.onBodyDragEnd)

		// Update positions 
		Matter.Events.on(this.matterEngine, 'afterUpdate', this.props.onAfterUpdate)

		// Renderer hooks
		//Matter.Events.on(this.matterRender, 'beforeRender', this.onBeforeRender)
		Matter.Events.on(this.matterRender, 'afterRender', this.onAfterRender)

		// Run the engine
		Matter.Engine.run(this.matterEngine)

		// Run the renderer
		RenderAuraProj.run(this.matterRender)
	}

	onAfterRender = event => {
		const gridSize = this.props.gridSize
		const ctx = event.source.context
		const canvasWidth = event.source.canvas.width
		const canvasHeight = event.source.canvas.height
		const bounds = event.source.bounds
		const mouse = event.source.mouse

		const mod = (x, n) => (x % n + n) % n
		const almostEqual = (a, b) => Math.abs(a - b) < 0.00001
		const roundDrawCoord = x => Math.round(x) + 0.5

		// Convert between viewport/canvas coords
		const boundsWidth = (bounds.max.x - bounds.min.x)
		const boundsHeight = (bounds.max.y - bounds.min.y)
		const scale = canvasWidth / boundsWidth

		const xOriginOffset = -bounds.min.x
		const yOriginOffset = -bounds.min.y

		const xGridOffset = mod(xOriginOffset, gridSize)
		const yGridOffset = mod(yOriginOffset, gridSize)

		const gridStrokeStyle = 'rgb(128, 128, 255, 0.2)'
		const originStrokeStyle = 'rgb(255, 128, 128, 0.5)'

		ctx.lineWidth = 1
		ctx.setLineDash([])
		ctx.strokeStyle = gridStrokeStyle
		ctx.fillStyle = "black"

		const drawXGridLine = (x, label) => {
			x = roundDrawCoord(x)
			ctx.beginPath()
			ctx.moveTo(x, 0)
			ctx.lineTo(x, canvasHeight)
			ctx.stroke()

			ctx.fillText(label, x + 2, canvasHeight - 2)
		}

		const drawYGridLine = (y, label) => {
			y = roundDrawCoord(y)
			ctx.beginPath()
			ctx.moveTo(0, y)
			ctx.lineTo(canvasWidth, y)
			ctx.stroke()

			ctx.fillText(label, 0, y + 2)
		}

		// Axis labels
		var xLabel = Math.floor(bounds.min.x / gridSize) * gridSize
		var yLabel = Math.floor(bounds.min.y / gridSize) * gridSize
		if (xGridOffset !== 0) xLabel += gridSize
		if (yGridOffset !== 0) yLabel += gridSize

		for (var x = xGridOffset; x < boundsWidth; x += gridSize, xLabel += gridSize) {
			if (almostEqual(x, xOriginOffset)) {
				// Red origin line
				ctx.save()
				ctx.strokeStyle = originStrokeStyle
				drawXGridLine(x * scale, xLabel)
				ctx.restore()
			}
			else drawXGridLine(x * scale, xLabel)
		}

		for (var y = yGridOffset; y < boundsHeight; y += gridSize, yLabel += gridSize) {
			if (almostEqual(y, yOriginOffset)) {
				// Red origin line
				ctx.save()
				ctx.strokeStyle = originStrokeStyle
				drawYGridLine(y * scale, yLabel)
				ctx.restore()
			}
			else drawYGridLine(y * scale, yLabel)
		}

		// Draw crosshairs
		if (!this.state.drawCursor || !mouse)
			return

		var crosshairX = mouse.position.x
		var crosshairY = mouse.position.y

		if (this.props.snapToGrid) {
			crosshairX = Math.round(crosshairX / gridSize) * gridSize
			crosshairY = Math.round(crosshairY / gridSize) * gridSize
		}

		const drawX = roundDrawCoord((crosshairX - bounds.min.x) * scale)
		const drawY = roundDrawCoord((crosshairY - bounds.min.y) * scale)

		ctx.strokeStyle = 'black'
		ctx.setLineDash([5, 8])
		ctx.beginPath()
		ctx.moveTo(drawX, 0)
		ctx.lineTo(drawX, canvasHeight)
		ctx.stroke()

		ctx.beginPath()
		ctx.moveTo(0, drawY)
		ctx.lineTo(canvasWidth, drawY)
		ctx.stroke()

		// Draw coordinates
		ctx.fillText(`${round(crosshairX, 2)}, ${round(crosshairY, 2)}`, drawX + 10, drawY - 10)
	}

	onBodyDragStart = event => {
		this.setState({
			draggingBody: true,
			dragStartPosition: Object.assign({}, event.mouse.position)
		})
	}

	onBodyDragEnd = event => {
		const oldPos = this.state.dragStartPosition
		const newPos = event.mouse.position

		// Clicked on an object without dragging - delete it
		if (oldPos.x === newPos.x && oldPos.y === newPos.y) {
			this.props.onObjectDeleted(event.body.id)
			Matter.Composite.remove(this.matterEngine.world, event.body)
		}
	}

	onMouseDown = event => {
		this.setState({mouseDown: true, mouseDownPosition: Object.assign({}, event.mouse.position)})
	}

	onMouseUp = event => {
		this.setState({mouseDown: false, mouseDownPosition: null})

		// Just finished dragging, bail out
		if (this.state.dragStartPosition) {
			this.setState({
				draggingBody: false,
				dragStartPosition: null,
				dragLastPosition: null
			})
			return
		}

		const mousePos = event.mouse.position

		if (this.props.snapToGrid) {
			const gridSize = this.props.gridSize
			mousePos.x = Math.round(mousePos.x / gridSize) * gridSize
			mousePos.y = Math.round(mousePos.y / gridSize) * gridSize
		}
			
		// Add new object
		const body = Matter.Bodies.circle(mousePos.x, mousePos.y, 10, { restitution: 0.5 })

		// Matter.Events.on(body, 'sleepStart', event => {
		// 	//this.sleepCount--
		// 	//console.log(this.sleepCount)
		// })

		// Matter.Events.on(body, 'sleepEnd', event => {
		// 	//this.sleepCount++
		// 	//console.log(this.sleepCount)
		// })

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

		if (!this.state.mouseDown || this.state.draggingBody)
			return


		if (!this.state.dragStartPosition) {
			this.setState({
				dragStartPosition: this.state.mouseDownPosition,
				dragLastPosition: this.state.mouseDownPosition
			})
		}

		// Drag actions
		switch (this.props.mouseMode) {
			case MouseMode.PAN: {
				// Dragging canvas
				const deltaX = event.mouse.position.x - this.state.dragLastPosition.x
				const deltaY = event.mouse.position.y - this.state.dragLastPosition.y

				// Reposition viewport
				this.matterRender.bounds.min.x -= deltaX
				this.matterRender.bounds.min.y -= deltaY
				this.matterRender.bounds.max.x -= deltaX
				this.matterRender.bounds.max.y -= deltaY

				// Update mouse offset
				Matter.Mouse.setOffset(this.matterMouseConstraint.mouse, this.matterRender.bounds.min)

				this.setState({dragLastPosition: Object.assign({}, event.mouse.position)})
				break
			}

			default: break
		}
			


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
		const mouse = this.matterMouse
		const zoomFactor = event.deltaY < 0 ? 0.9 : 1 / 0.9
		const bounds = this.matterRender.bounds

		// Reposition viewport
		bounds.min.x = zoomFactor * (bounds.min.x - mouse.position.x) + mouse.position.x
		bounds.min.y = zoomFactor * (bounds.min.y - mouse.position.y) + mouse.position.y
		bounds.max.x = zoomFactor * (bounds.max.x - mouse.position.x) + mouse.position.x
		bounds.max.y = zoomFactor * (bounds.max.y - mouse.position.y) + mouse.position.y
	}

	spawnRandomObjects = count => {
		var bodies = []
		for (var i = 0; i < count; ++i) {
			const x = random(this.matterRender.bounds.min.x, this.matterRender.bounds.max.x, true)
			const y = random(this.matterRender.bounds.min.y, this.matterRender.bounds.max.y, true)
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
			// Don't apply any borders/scaling etc to the canvas directly or mouse coords will be off
			<div id={"canvasContainer"}>
				<canvas
					ref={this.canvasRef}
					onMouseOver={this.onMouseOver}
					onMouseOut={this.onMouseOut}
					onWheel={this.onWheel}
				/>
			</div>
		)
	}
}
