import React, { PureComponent } from 'react'
import Matter from 'matter-js'
import Util from './util'
import { random } from 'lodash'

// Custom renderer
const RenderAuraProj = require('./renderauraproj')

export const MouseMode = {
	PAN: 'pan',
	BOUNDARY_EDIT: 'boundary_edit',
	SNOOKER: 'snooker',
}

const ResizeMode = {
	LEFT_EDGE: 'left_edge',
	RIGHT_EDGE: 'right_edge',
	TOP_EDGE: 'top_edge',
	BOTTOM_EDGE: 'bottom_edge',
	TOP_LEFT_CORNER: 'top_left_corner',
	TOP_RIGHT_CORNER: 'top_right_corner',
	BOTTOM_RIGHT_CORNER: 'bottom_right_corner',
	BOTTOM_LEFT_CORNER: 'bottom_left_corner'
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
			dragStartPos: null,
			dragLastPos: null,

			clickedBoundary: null,
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

		// Prevent menus on canvas
		canvas.oncontextmenu = () => false
		canvas.onselectstart = () => false		

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
		Matter.Events.on(this.matterRender, 'beforeObjects', this.onBeforeObjects)

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

	onBeforeObjects = event => {
		const context = event.source.context
		const mousePos = this.getMousePos(true)
		const mousePosUnsnapped = this.getMousePos(true, true)

		// Draw boundaries
		context.setLineDash([])
		context.lineWidth = 1

		this.props.boundaries.forEach((boundary, index) => {
			const topLeft = this.worldToCanvas(boundary.bounds.min)
			const bottomRight = this.worldToCanvas(boundary.bounds.max)
			const extents = Matter.Vector.sub(bottomRight, topLeft)

			const mouseInBounds = Util.pointInBounds(mousePosUnsnapped, { min: topLeft, max: bottomRight }, false)
			const isClickedBoundary = this.state.clickedBoundary && this.state.clickedBoundary.index === index

			context.fillStyle = boundary.color
			context.strokeStyle = 'black'

			if (this.props.mouseMode === MouseMode.BOUNDARY_EDIT && (isClickedBoundary || mouseInBounds))
				context.globalAlpha = 0.75
			else
				context.globalAlpha = 0.5

			context.beginPath()
			context.fillRect(topLeft.x, topLeft.y, extents.x, extents.y)
			context.globalAlpha = 1.0
			context.rect(topLeft.x, topLeft.y, extents.x, extents.y)
			context.stroke()
		})

		switch (this.props.mouseMode) {
			case MouseMode.BOUNDARY_EDIT: {
				if (!this.state.mouseDownPos || this.state.clickedBoundary)
					break

				// Draw outline of new boundary
				const topLeft = this.worldToCanvas(this.state.mouseDownPos)
				const width = mousePos.x - topLeft.x
				const height = mousePos.y - topLeft.y

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
			dragStartPos: Object.assign({}, event.mouse.position)
		})
	}

	onBodyDragEnd = event => {
		const oldPos = this.state.dragStartPos
		const newPos = event.mouse.position

		// Clicked on an object without dragging - delete it
		if (oldPos.x === newPos.x && oldPos.y === newPos.y) {
			this.props.onObjectDeleted(event.body.id)
			Matter.Composite.remove(this.matterEngine.world, event.body)
		}
	}

	checkResizeMode = bounds => {
		const threshold = 5
		var resizeMode = null

		const mousePosCanvas = this.getMousePos(true, true)
		const boundsCanvas = {
			min: this.worldToCanvas(bounds.min),
			max: this.worldToCanvas(bounds.max)
		}

		const leftDist 	= Math.abs(boundsCanvas.min.x - mousePosCanvas.x)
		const rightDist = Math.abs(boundsCanvas.max.x - mousePosCanvas.x)
		const topDist = Math.abs(boundsCanvas.min.y - mousePosCanvas.y)
		const bottomDist = Math.abs(boundsCanvas.max.y - mousePosCanvas.y)

		// Check corners
		if (leftDist <= threshold && topDist <= threshold)
			resizeMode = ResizeMode.TOP_LEFT_CORNER
		else if (rightDist <= threshold && topDist <= threshold)
			resizeMode = ResizeMode.TOP_RIGHT_CORNER
		else if (rightDist <= threshold && bottomDist <= threshold)
			resizeMode = ResizeMode.BOTTOM_RIGHT_CORNER
		else if (leftDist <= threshold && bottomDist <= threshold)
			resizeMode = ResizeMode.BOTTOM_LEFT_CORNER

		// Check edges
		else if (leftDist <= threshold)
			resizeMode = ResizeMode.LEFT_EDGE
		else if (rightDist <= threshold)
			resizeMode = ResizeMode.RIGHT_EDGE
		else if (topDist <= threshold)
			resizeMode = ResizeMode.TOP_EDGE
		else if (bottomDist <= threshold)
			resizeMode = ResizeMode.BOTTOM_EDGE

		return resizeMode
	}

	updateCanvasCursorStyle = resizeMode => {
		const canvas = this.canvasRef.current

		switch (resizeMode) {
			case ResizeMode.TOP_LEFT_CORNER: 		canvas.style.cursor = 'nw-resize'; 	break;
			case ResizeMode.TOP_RIGHT_CORNER:		canvas.style.cursor = 'ne-resize'; 	break;
			case ResizeMode.BOTTOM_RIGHT_CORNER:	canvas.style.cursor = 'se-resize'; 	break;
			case ResizeMode.BOTTOM_LEFT_CORNER:		canvas.style.cursor = 'sw-resize'; 	break;
			case ResizeMode.LEFT_EDGE: 				canvas.style.cursor = 'w-resize'; 	break;
			case ResizeMode.RIGHT_EDGE:				canvas.style.cursor = 'e-resize'; 	break;
			case ResizeMode.TOP_EDGE:				canvas.style.cursor = 'n-resize'; 	break;
			case ResizeMode.BOTTOM_EDGE:			canvas.style.cursor = 's-resize'; 	break;
			default:								canvas.style.cursor = 'crosshair';	break;
		}
	}

	onMouseDown = event => {
		const mousePos = this.getMousePos()
		const mousePosCanvas = this.getMousePos(true)
		this.setState({
			mouseDownPos: mousePos,
			mouseDownPosCanvas: mousePosCanvas
		})

		switch (this.props.mouseMode) {
			case MouseMode.SNOOKER: {
				// Did we click on an object?
				const allBodies = Matter.Composite.allBodies(this.matterEngine.world)
				const bodies = Matter.Query.point(allBodies, mousePos)
				this.setState({snookerBody: bodies[0]})
				break
			}

			case MouseMode.BOUNDARY_EDIT: {
				const boundary = this.boundaryUnderMouse()
				if (!boundary)
					break

				// Mouse went down over a boundary - was it near an edge?
				const resizeMode = this.checkResizeMode(boundary.bounds)
				this.updateCanvasCursorStyle(resizeMode)
				this.setState({
					clickedBoundary: boundary,
					resizeOldBounds: {
						min: Object.assign({}, boundary.bounds.min),
						max: Object.assign({}, boundary.bounds.max)
					},
					resizeMode: resizeMode
				})

				break
			}

			default: break
		}
	}

	onMouseUp = event => {
		const mousePos = this.getMousePos()
		const mousePosCanvas = this.getMousePos(true)
		const click = this.state.mouseDownPosCanvas.x === mousePosCanvas.x && this.state.mouseDownPosCanvas.y === mousePosCanvas.y
		
		switch (this.props.mouseMode) {
			case MouseMode.PAN: {
				// Just finished dragging an object, bail out
				if (this.state.dragStartPos) {
					this.setState({
						draggingBody: false,
						dragStartPos: null
					})
					break
				}

				// Add new object
				const body = Matter.Bodies.circle(mousePos.x, mousePos.y, 10, { restitution: 0.5 })
				
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

			case MouseMode.BOUNDARY_EDIT: {
				// Did we just finish resizing? Clear state and bail out
				if (this.state.resizeMode) {
					this.setState({
						resizeMode: null,
						resizeOldBounds: null
					})
					this.updateCanvasCursorStyle(null)
					break
				}

				// Did we click on an existing boundary? Delete it and bail out
				if (click && this.state.clickedBoundary && this.props.onBoundaryDeleted) {
					this.props.onBoundaryDeleted(this.state.clickedBoundary.index)
					break
				}

				// Otherwise, add a new boundary
				if (this.props.onBoundaryAdded && this.state.mouseDownPos)
					this.props.onBoundaryAdded(Util.createBounds(this.state.mouseDownPos, mousePos))

				break
			}

			default: break
		}

		this.setState({
			mouseDownPos: null,
			mouseDownPosCanvas: null,
			clickedBoundary: null
		})
	}

	onMouseMove = event => {
		const mousePos = this.getMousePos()

		// Drag actions
		switch (this.props.mouseMode) {
			case MouseMode.PAN: {
				if (!this.state.mouseDownPos || this.state.draggingBody)
					return

				const bounds = this.matterRender.bounds
				const delta = {
					x: event.mouse.position.x - this.state.mouseDownPos.x,
					y: event.mouse.position.y - this.state.mouseDownPos.y
				}

				// Reposition viewport
				bounds.min = Matter.Vector.sub(bounds.min, delta)
				bounds.max = Matter.Vector.sub(bounds.max, delta)

				// Update mouse offset
				Matter.Mouse.setOffset(this.matterMouseConstraint.mouse, bounds.min)
				break
			}

			case MouseMode.BOUNDARY_EDIT: {
				// Not resizing
				if (!this.state.resizeMode) {
					// Not in the middle of a resize - just update the cursor
					const boundary = this.boundaryUnderMouse()
					if (boundary)
						this.updateCanvasCursorStyle(this.checkResizeMode(boundary.bounds))
					else
						this.updateCanvasCursorStyle(null)
					break
				}

				// Resizing: move the boundary edges 
				if (!this.props.onBoundaryUpdated)
					break

				const oldBounds = this.state.resizeOldBounds
				var newBounds = {
					min: Object.assign({}, oldBounds.min),
					max: Object.assign({}, oldBounds.max)
				}

				switch (this.state.resizeMode) {
					case ResizeMode.TOP_LEFT_CORNER:
						newBounds.min.x = mousePos.x
						newBounds.min.y = mousePos.y
						break

					case ResizeMode.TOP_RIGHT_CORNER:
						newBounds.max.x = mousePos.x
						newBounds.min.y = mousePos.y
						break

					case ResizeMode.BOTTOM_LEFT_CORNER:
						newBounds.min.x = mousePos.x
						newBounds.max.y = mousePos.y
						break

					case ResizeMode.BOTTOM_RIGHT_CORNER:
						newBounds.max.x = mousePos.x
						newBounds.max.y = mousePos.y
						break

					case ResizeMode.LEFT_EDGE:
						newBounds.min.x = mousePos.x
						break

					case ResizeMode.RIGHT_EDGE:
						newBounds.max.x = mousePos.x
						break
					
					case ResizeMode.TOP_EDGE:
						newBounds.min.y = mousePos.y
						break

					case ResizeMode.BOTTOM_EDGE:
						newBounds.max.y = mousePos.y
						break
					
					default:
						break
				}

				// Fixup so that min is always at the top left and max is always at the bottom right
				newBounds = Util.createBounds(newBounds.min, newBounds.max)

				this.props.onBoundaryUpdated(this.state.clickedBoundary.index, newBounds)
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
		this.setState({
			// Hide crosshair and coords
			showCrosshair: false,

			// Clear drawing/resizing state
			mouseDownPos: null
		})
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

	boundaryUnderMouse = () => {
		var boundaryUnder = null
		this.props.boundaries.forEach((boundary, i) => {
			if (Util.pointInBounds(this.matterMouse.position, boundary.bounds))
				boundaryUnder = {index: i, bounds: boundary.bounds}
		})

		return boundaryUnder
	}

	// Get position of mouse in canvas or world space (snapped to grid if necessary)
	getMousePos = (canvas = false, forceUnsnapped = false) => {
		const gridSize = this.props.gridSize
		const mousePos = {
			x: this.matterMouse.position.x,
			y: this.matterMouse.position.y
		}

		if (!forceUnsnapped && this.props.snapToGrid) {
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
