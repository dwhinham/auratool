import React, { PureComponent } from 'react'

import Matter from 'matter-js'

import { clamp, random, round } from 'lodash'

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
		this.matterRender = Matter.Render.create({
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
				//showDebug: true,
				showMousePosition: true
			}
		})
		
		Matter.World.add(this.matterEngine.world, this.matterMouseConstraint)

		// Temp
		const body = Matter.Bodies.circle(0, 0, 20, { restitution: 0.5 })
		const body2 = Matter.Bodies.circle(0, 100, 10, { restitution: 0.5 })
		Matter.World.add(this.matterEngine.world, [body, body2])

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
		Matter.Render.run(this.matterRender)
	}

	onAfterRender = event => {
		const gridSize = 50
		const ctx = event.source.context
		const canvasWidth = event.source.canvas.width
		const canvasHeight = event.source.canvas.height
		const bounds = event.source.bounds
		const mouse = event.source.mouse

		// Convert between viewport/canvas coords
		const mod = (x, n) => (x % n + n) % n
		const boundsWidth = bounds.max.x - bounds.min.x
		const boundsHeight = bounds.max.y - bounds.min.y
		const xRatio = (1.0 - mod(bounds.min.x, boundsWidth) / boundsWidth) * canvasWidth
		const yRatio = (1.0 - mod(bounds.min.y, boundsHeight) / boundsHeight) * canvasHeight
		const xGridStep = Math.ceil(canvasWidth / boundsWidth * gridSize)
		const yGridStep = Math.ceil(canvasHeight / boundsHeight) * gridSize
		const xGridOffset = xRatio % xGridStep
		const yGridOffset = yRatio % yGridStep

		//console.log(`${xRatio}`)

		// Draw origin if it's in view
		ctx.lineWidth = 1
		ctx.strokeStyle = 'rgb(255, 128, 128, 0.5)'
		ctx.setLineDash([])

		if (bounds.min.x <= 0 && bounds.max.x > 0)
		{
			ctx.beginPath()
			ctx.moveTo(xRatio, 0)
			ctx.lineTo(xRatio, canvasHeight)
			ctx.stroke()
		}

		if (bounds.min.y <= 0 && bounds.max.y > 0)
		{
			ctx.beginPath()
			ctx.moveTo(0, yRatio)
			ctx.lineTo(canvasWidth, yRatio)
			ctx.stroke()
		}

		// Draw grid
		ctx.strokeStyle = 'rgb(128, 128, 255, 0.2)'
		ctx.fillStyle = "black"

		var xLabel = Math.floor(bounds.min.x / gridSize) * gridSize
		var yLabel = Math.floor(bounds.min.y / gridSize) * gridSize

		const xDivisions = boundsWidth / 50;
		//const hCellsNum = boundingRect.width / cellSize;
	  
		for (var i = 0; i <= xDivisions; i++) {
			var offsetXPos = xGridOffset// Math.ceil(-bounds.min.x / 50) * 50;
			var xPos = offsetXPos + i * xGridStep;
			ctx.beginPath()
			ctx.moveTo(xPos, 0)
			ctx.lineTo(xPos, canvasHeight)
			ctx.stroke()
		}

		// for (var x = xGridOffset; x < canvasWidth; x += xGridStep) {
		// 	ctx.beginPath()
		// 	ctx.moveTo(x + 0.5, 0)
		// 	ctx.lineTo(x + 0.5, canvasHeight)
		// 	ctx.stroke()

		// 	ctx.fillText(xLabel, x + 2, canvasHeight - 2)
		// 	xLabel += gridSize
		// }

		// for (var y = yGridOffset; y < canvasHeight; y += yGridStep) {
		// 	ctx.beginPath()
		// 	ctx.moveTo(0, y + 0.5)
		// 	ctx.lineTo(canvasWidth, y + 0.5)
		// 	ctx.stroke()

		// 	ctx.fillText(yLabel, 2, y + 2)
		// 	yLabel += gridSize
		// }

		// Draw crosshairs
		if (!this.state.drawCursor || !mouse)
			return

		ctx.strokeStyle = 'black'
		ctx.setLineDash([5, 8])
		ctx.beginPath()
		ctx.moveTo(mouse.absolute.x + 0.5, 0)
		ctx.lineTo(mouse.absolute.x + 0.5, canvasHeight)
		ctx.stroke()

		ctx.beginPath()
		ctx.moveTo(0, mouse.absolute.y + 0.5)
		ctx.lineTo(canvasWidth, mouse.absolute.y + 0.5)
		ctx.stroke()

		// Draw coordinates
		ctx.fillText(`${round(mouse.position.x, 2)}, ${round(mouse.position.y, 2)}`, mouse.absolute.x + 10, mouse.absolute.y - 10)
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
		console.log('mousedown')
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
		if (!this.state.dragStartPosition && this.state.mouseDown)
			this.setState({
				dragStartPosition: this.state.mouseDownPosition,
				dragLastPosition: this.state.mouseDownPosition
			})
			
		// Dragging canvas
		if (!this.state.draggingBody && this.state.dragStartPosition && this.state.mouseDown) {
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
		}

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
			<div id={"gridCanvas"}>
				<canvas
					width={500}
					height={500}
					ref={this.canvasRef}
					onMouseOver={this.onMouseOver}
					onMouseOut={this.onMouseOut}
					onWheel={this.onWheel}
				/>
			</div>
		)
	}
}
