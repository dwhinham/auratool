import React, { PureComponent } from 'react'
import Matter from 'matter-js'
import { random } from 'lodash'

// Custom renderer
const RenderAuraProj = require('./renderauraproj')

export const MouseMode = {
	PAN: 'pan',
	DRAW_BOUNDARY: 'draw_boundary',
	SNOOKER: 'snooker',
}

export default class Server extends PureComponent {
	static whyDidYouRender = true
	sleepCount = 0

	constructor(props) {
		super(props)

		this.canvasRef = React.createRef()

		this.state = {
			showCrosshair: false,
			draggingBody: false,
			dragStartPosition: null,
			dragLastPosition: null,

			snookerBody: null,
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

		// Engine hooks
		Matter.Events.on(this.matterEngine, 'beforeUpdate', this.onBeforeUpdate)
		Matter.Events.on(this.matterEngine, 'afterUpdate', this.props.onAfterUpdate)

		// Renderer hooks
		Matter.Events.on(this.matterRender, 'beforeRender', this.onBeforeRender)
		Matter.Events.on(this.matterRender, 'afterRender', this.onAfterRender)

		// Run the engine
		Matter.Engine.run(this.matterEngine)

		// Run the renderer
		RenderAuraProj.run(this.matterRender)
	}

	onBeforeUpdate = event => {
		// Should we disable the mouse constraint (grab objects?)
		if (this.props.mouseMode !== MouseMode.PAN)
			this.matterMouseConstraint.collisionFilter.mask = 0
		else
			this.matterMouseConstraint.collisionFilter.mask = 0xFFFFFFFF
	}

	onBeforeRender = event => {
		// Update some rendering options
		const render = event.source
		render.options.gridSize = this.props.gridSize
		render.options.showCrosshair = this.state.showCrosshair
		render.options.crosshairSnap = this.props.snapToGrid
	}

	onAfterRender = event => {
		const context = event.source.context
		const mousePos = this.getMousePos(true)

		switch (this.props.mouseMode) {
			case MouseMode.DRAW_BOUNDARY: {
				if (!this.state.dragStartPosition)
					break

				// Draw boundary
				const topLeft = this.worldToCanvas(this.state.dragStartPosition)
				const width = mousePos.x - topLeft.x
				const height = mousePos.y - topLeft.y

				context.setLineDash([])
				context.lineWidth = 2
				context.strokeStyle = 'blue'
				context.fillStyle = 'rgb(128, 128, 255, 0.2)'
				context.beginPath()
				context.fillRect(topLeft.x, topLeft.y, width, height)
				context.rect(topLeft.x, topLeft.y, width, height)
				context.stroke()

				break
			}

			case MouseMode.SNOOKER: {
				if (!this.state.snookerBody)
					break

				// Draw snooker "cue"
				const bodyPos = this.worldToCanvas(this.state.snookerBody.position)

				context.setLineDash([])
				context.strokeStyle = 'red'
				context.beginPath()
				context.moveTo(bodyPos.x, bodyPos.y)
				context.lineTo(mousePos.x, mousePos.y)
				context.stroke()
				
				break
			}

			default: break
		}
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
		const mousePos = this.getMousePos()

		this.setState({
			mouseDown: true,
			mouseDownPosition: mousePos
		})

		switch (this.props.mouseMode) {
			case MouseMode.SNOOKER: {
				// Did we click on an object?
				const allBodies = Matter.Composite.allBodies(this.matterEngine.world)
				const bodies = Matter.Query.point(allBodies, mousePos)
				this.setState({snookerBody: bodies[0]})
				break
			}

			case MouseMode.DRAW_BOUNDARY: {
				this.setState({dragStartPosition: mousePos})
				break
			}

			default: break
		}
	}

	onMouseUp = event => {
		this.setState({mouseDown: false, mouseDownPosition: null})

		const mousePos = this.getMousePos()
		
		switch (this.props.mouseMode) {
			case MouseMode.PAN: {
				// Just finished dragging, bail out
				if (this.state.dragStartPosition) {
					this.setState({
						draggingBody: false,
						dragStartPosition: null,
						dragLastPosition: null
					})
					break
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
				break
			}

			case MouseMode.SNOOKER: {
				if (!this.state.snookerBody)
					break;

				const body = this.state.snookerBody
				const force = Matter.Vector.mult(Matter.Vector.sub(body.position, mousePos), 0.001 * body.mass)

				Matter.Body.applyForce(body, body.position, force)
				this.setState({ snookerBody: null })
				break
			}

			case MouseMode.DRAW_BOUNDARY: {
				const bounds = {
					min: this.state.dragStartPosition,
					max: mousePos
				}
				
				console.log(`new boundary: {${bounds.min.x}, ${bounds.min.y}} -> {${bounds.max.x}, ${bounds.max.y}}`)

				if (this.props.onBoundaryCreated)
					this.props.onBoundaryCreated(bounds)

				this.setState({dragStartPosition: null})

				break
			}

			default: break
		}
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
		this.setState({ showCrosshair: true })
	}

	onMouseOut = event => {
		// Hide crosshair and coords
		this.setState({ showCrosshair: false })
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

	// Convert a position in world space to canvas space
	worldToCanvas = position => {
		const render = this.matterRender
		const scale = render.canvas.width / (render.bounds.max.x - render.bounds.min.x)
		return Matter.Vector.mult(Matter.Vector.sub(position, render.bounds.min), scale)
	}

	// Get position of mouse in canvas or world space (snapped to grid if necessary)
	getMousePos = (canvas = false) => {
		const gridSize = this.props.gridSize
		const mousePos = {
			x: this.matterMouse.position.x,
			y: this.matterMouse.position.y
		}

		if (this.props.snapToGrid) {
			mousePos.x = Math.round(mousePos.x / gridSize) * gridSize
			mousePos.y = Math.round(mousePos.y / gridSize) * gridSize
		}

		return canvas ? this.worldToCanvas(mousePos) : mousePos
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
