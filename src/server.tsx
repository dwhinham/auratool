///<reference path="./types/types.d.ts" />

import * as React from 'react'
import Matter from 'matter-js'
import { createBounds, pointInBounds } from './util'
import { random } from 'lodash'

// Custom renderer
import { RenderAuraProj } from './renderauraproj'

export enum MouseMode {
	OBJECT,
	BOUNDARY_EDIT,
	SNOOKER
}

enum ResizeMode {
	NONE,
	LEFT_EDGE,
	RIGHT_EDGE,
	TOP_EDGE,
	BOTTOM_EDGE,
	TOP_LEFT_CORNER,
	TOP_RIGHT_CORNER,
	BOTTOM_RIGHT_CORNER,
	BOTTOM_LEFT_CORNER,
	HORIZONTAL_SPLIT,
	VERTICAL_SPLIT,
	CROSS_SPLIT
}

interface BoundaryMouseInfo {
	index: number,
	bounds: Bounds
}

interface ServerProps {
	boundaries: Array<Boundary>,
	mouseMode: MouseMode,
	snapToGrid: boolean,
	gridSize: number,

	onEngineBeforeUpdate: () => {},
	onEngineAfterUpdate: () => {},

	onObjectAdded: (body: Matter.Body) => {},
	onObjectDeleted: (id: number) => {},

	onBoundaryAdded: (bounds: Bounds) => {}
	onBoundaryUpdated: (index: number, newBounds: Bounds) => {}
	onBoundaryDeleted: (index: number) => {}
}

interface ServerState {
	canvasRef: React.RefObject<HTMLCanvasElement>,
	showCrosshair: boolean,
	draggingBody: boolean,
	mouseButton: number | undefined,
	mouseDownPos: Point | undefined,
	mouseDownPosCanvas: Point | undefined,
	dragStartPos: Point | undefined,
	dragLastPos: Point | undefined,
	clickedBoundary: BoundaryMouseInfo | undefined,
	snookerBody: Matter.Body | undefined,
	resizeMode: ResizeMode,
	resizeOldBounds: Bounds | undefined
}

export default class Server extends React.PureComponent<ServerProps, ServerState> {
	static whyDidYouRender = true

	matterEngine: Matter.Engine | undefined
	matterMouse: Matter.Mouse | undefined
	matterMouseConstraint: Matter.MouseConstraint | undefined
	matterRender: RenderAuraProj | undefined
	matterRunner: Matter.Runner | undefined
	matterWorld: Matter.World | undefined

	constructor(props: ServerProps) {
		super(props)

		let canvasRef: React.RefObject<HTMLCanvasElement> = React.createRef()

		this.state = {
			canvasRef: canvasRef,
			showCrosshair: false,
			draggingBody: false,
			mouseButton: undefined,
			mouseDownPos: undefined,
			mouseDownPosCanvas: undefined,
			dragStartPos: undefined,
			dragLastPos: undefined,
			clickedBoundary: undefined,
			snookerBody: undefined,
			resizeMode: ResizeMode.NONE,
			resizeOldBounds: undefined
		}
	}

	componentDidMount = () => {
		// Get canvas context and set it up
		const canvas = this.state.canvasRef.current
		if (!canvas) {
			console.log("Canvas ref is null")
			return
		}

		const ctx = canvas.getContext("2d")
		if (!ctx) {
			console.log("Couldn't get a 2D canvas context")
			return
		}

		ctx.font = "12px Arial"

		// Fit canvas to container
		// TODO: make this dynamic
		canvas.style.width = "100%"
		canvas.style.height = "100%"
		canvas.width  = canvas.offsetWidth
		canvas.height = canvas.offsetHeight

		// Prevent menus on canvas
		canvas.oncontextmenu = () => false
		canvas.onselectstart = () => false		

		// Create a physics world
		this.matterWorld = Matter.World.create({
			// Top-down, so no gravity
			gravity: {
				scale: 1,
				x: 0,
				y: 0
			}
		})

		// Create a physics engine
		this.matterEngine = Matter.Engine.create({
			enableSleeping: true,
			world: this.matterWorld
		})

		// Add mouse control
		this.matterMouse = Matter.Mouse.create(canvas)
		this.matterMouseConstraint = Matter.MouseConstraint.create(this.matterEngine, {
            mouse: this.matterMouse,
            constraint: {
				stiffness: 0.2,
				render: {
					lineWidth: 0,
					strokeStyle: 'black',
					visible: false
				}
			} as Matter.Constraint
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
		
		Matter.World.add(this.matterWorld, this.matterMouseConstraint)

		// Temp
		for (let x = 0; x < 9; ++x) {
			for (let y = 0; y < 9; ++y) {
				const body = Matter.Bodies.circle(x * 50 - 200, y * 50 - 200, 20, { restitution: 0.5 })
				Matter.World.add(this.matterWorld, body)		
			}
		}

		const body = Matter.Bodies.circle(0, 300, 50, { restitution: 0.5 })
		Matter.World.add(this.matterWorld, body)	

		// Create runner
		this.matterRunner = Matter.Runner.create({ isFixed: false })

		// Mouse handlers
		Matter.Events.on(this.matterMouseConstraint, 'startdrag', this.onBodyDragStart)
		Matter.Events.on(this.matterMouseConstraint, 'enddrag', this.onBodyDragEnd)

		// Engine/runner hooks
		Matter.Events.on(this.matterEngine, 'beforeUpdate', this.onBeforeUpdate)
		Matter.Events.on(this.matterEngine, 'beforeUpdate', this.props.onEngineBeforeUpdate)
		Matter.Events.on(this.matterEngine, 'afterUpdate', this.props.onEngineAfterUpdate)

		// Renderer hooks
		Matter.Events.on(this.matterRender, 'beforeRender', this.onBeforeRender)
		Matter.Events.on(this.matterRender, 'beforeObjects', this.onBeforeObjects)

		// Run the engine
		Matter.Runner.run(this.matterRunner, this.matterEngine)

		// Run the renderer
		RenderAuraProj.run(this.matterRender)
	}

	onBeforeUpdate = (event: Matter.IEventTimestamped<Matter.Engine>) => {
		if (!this.matterMouseConstraint)
			return
			
		// Should we disable the mouse constraint (grab objects?)
		if (this.props.mouseMode !== MouseMode.OBJECT)
			this.matterMouseConstraint.collisionFilter.mask = 0
		else
			this.matterMouseConstraint.collisionFilter.mask = 0xFFFFFFFF
	}

	onBeforeRender = (event: Matter.IEventTimestamped<Matter.Render>) => {
		if (!this.matterRender)
			return

		// Update some rendering options
		this.matterRender.options.gridSize = this.props.gridSize
		this.matterRender.options.showCrosshair = this.state.showCrosshair
		this.matterRender.options.crosshairSnap = this.props.snapToGrid
	}

	onBeforeObjects = (event: Matter.IEventTimestamped<Matter.Render>) => {
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

			const mouseInBounds = pointInBounds(mousePosUnsnapped, { min: topLeft, max: bottomRight }, false)
			const isClickedBoundary = this.state.clickedBoundary && this.state.clickedBoundary.index === index

			context.fillStyle = boundary.color
			context.strokeStyle = 'black'

			if (this.props.mouseMode === MouseMode.BOUNDARY_EDIT && (isClickedBoundary || mouseInBounds))
				context.globalAlpha = 0.6
			else
				context.globalAlpha = 0.4

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

	onBodyDragStart = () => {
		this.setState({ draggingBody: true })
	}

	onBodyDragEnd = () => {
		this.setState({ draggingBody: false })
	}

	checkResizeMode = (bounds: Bounds) => {
		const threshold = 10
		let resizeMode = ResizeMode.NONE

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

	updateCanvasCursorStyle = (resizeMode?: ResizeMode, boundaryUnderMouse?: BoundaryMouseInfo) => {
		const canvas = this.state.canvasRef.current
		if (!canvas)
			return

		switch (resizeMode) {
			case ResizeMode.TOP_LEFT_CORNER: 		canvas.style.cursor = 'nw-resize'; 	break;
			case ResizeMode.TOP_RIGHT_CORNER:		canvas.style.cursor = 'ne-resize'; 	break;
			case ResizeMode.BOTTOM_RIGHT_CORNER:	canvas.style.cursor = 'se-resize'; 	break;
			case ResizeMode.BOTTOM_LEFT_CORNER:		canvas.style.cursor = 'sw-resize'; 	break;
			case ResizeMode.LEFT_EDGE: 				canvas.style.cursor = 'w-resize'; 	break;
			case ResizeMode.RIGHT_EDGE:				canvas.style.cursor = 'e-resize'; 	break;
			case ResizeMode.TOP_EDGE:				canvas.style.cursor = 'n-resize'; 	break;
			case ResizeMode.BOTTOM_EDGE:			canvas.style.cursor = 's-resize'; 	break;
			default:			
				if (boundaryUnderMouse && this.state.clickedBoundary)
					canvas.style.cursor = 'grabbing';
				else if (boundaryUnderMouse)
					canvas.style.cursor = 'grab';
				else					
					canvas.style.cursor = 'crosshair';
				break;
		}
	}

	onMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
		const mousePos = this.getMousePos()
		const mousePosCanvas = this.getMousePos(true)

		this.setState({
			mouseButton: event.button,
			mouseDownPos: mousePos,
			mouseDownPosCanvas: mousePosCanvas
		})

		switch (this.props.mouseMode) {
			case MouseMode.SNOOKER: {
				// Did we left-click on an object?
				if (event.button === 0) {
					this.setState({snookerBody: this.bodyAtPosition(mousePos)})
				}
				break
			}

			case MouseMode.BOUNDARY_EDIT: {
				const boundary = this.boundaryUnderMouse()
				if (!boundary)
					break

				// Left-click: check & prepare for resize
				let resizeMode = ResizeMode.NONE
				if (event.button === 0) {
					resizeMode = this.checkResizeMode(boundary.bounds)
					this.updateCanvasCursorStyle(resizeMode, boundary)
				}

				// Mouse button went down over a boundary
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

	onMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
		if (!this.matterWorld)
			return

		const mousePos = this.getMousePos()
		const mousePosCanvas = this.getMousePos(true)
		const click = 	this.state.mouseButton === event.button &&
						this.state.mouseDownPosCanvas &&
						(this.state.mouseDownPosCanvas.x === mousePosCanvas.x &&
						this.state.mouseDownPosCanvas.y === mousePosCanvas.y)

		switch (this.props.mouseMode) {
			case MouseMode.OBJECT: {
				// Dragging an object, bail out
				if (this.state.draggingBody)
					break

				// Left-click: add new object
				if (event.button === 0) {
					const body = Matter.Bodies.circle(mousePos.x, mousePos.y, 20, { restitution: 0.5 })
				
					Matter.World.add(this.matterWorld, body)
					if (this.props.onObjectAdded)
					this.props.onObjectAdded(body)
				}

				// Right-click: delete object
				else if (event.button === 2) {
					const body = this.bodyAtPosition(mousePos)
					if (body) {
						if (this.props.onObjectDeleted)
						this.props.onObjectDeleted(body.id)
						Matter.Composite.remove(this.matterWorld, body)
					}
				}

				break
			}

			case MouseMode.SNOOKER: {
				if (!this.state.snookerBody || event.button !== 0)
					break

				const body = this.state.snookerBody
				const force = Matter.Vector.mult(Matter.Vector.sub(body.position, mousePos), 0.001 * body.mass)

				Matter.Body.applyForce(body, body.position, force)
				this.setState({ snookerBody: undefined })
				break
			}

			case MouseMode.BOUNDARY_EDIT: {
				// Did we just finish resizing? Clear state and bail out
				if (this.state.resizeMode !== ResizeMode.NONE) {
					this.setState({
						resizeMode: ResizeMode.NONE,
						resizeOldBounds: undefined
					})
					break
				}

				// Did we right-click on an existing boundary? Delete it and bail out
				if (this.props.onBoundaryDeleted && event.button === 2 && click && this.state.clickedBoundary) {
					this.props.onBoundaryDeleted(this.state.clickedBoundary.index)
					break
				}

				// Otherwise, add a new boundary
				if (this.props.onBoundaryAdded && event.button === 0 && this.state.mouseDownPos)
					this.props.onBoundaryAdded(createBounds(this.state.mouseDownPos, mousePos))

				break
			}

			default: break
		}

		this.setState({
			mouseButton: undefined,
			mouseDownPos: undefined,
			mouseDownPosCanvas: undefined,
			clickedBoundary: undefined
		})

		this.updateCanvasCursorStyle(undefined, this.boundaryUnderMouse())
	}

	onMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
		if (!this.matterRender || !this.matterMouseConstraint)
			return

		const mousePos = this.getMousePos()

		// Right click always pans
		if (this.state.mouseButton === 2) {
			if (!this.state.mouseDownPos || this.state.draggingBody)
				return

			const bounds = this.matterRender.bounds
			const delta = {
				x: mousePos.x - this.state.mouseDownPos.x,
				y: mousePos.y - this.state.mouseDownPos.y
			}

			// Reposition viewport
			bounds.min = Matter.Vector.sub(bounds.min, delta)
			bounds.max = Matter.Vector.sub(bounds.max, delta)

			// Update mouse offset
			Matter.Mouse.setOffset(this.matterMouseConstraint.mouse, bounds.min)
			return
		}

		// Left click actions
		switch (this.props.mouseMode) {
			case MouseMode.BOUNDARY_EDIT: {
				// Not resizing or moving
				if (this.state.resizeMode === ResizeMode.NONE && !this.state.clickedBoundary) {
					// Just look for a boundary under the mouse and update the cursor
					const boundary = this.boundaryUnderMouse()
					if (boundary)
						this.updateCanvasCursorStyle(this.checkResizeMode(boundary.bounds), boundary)
					else
						this.updateCanvasCursorStyle(undefined)
					break
				}

				// Bail out if we don't have a callback or a clicked boundary
				if (!this.props.onBoundaryUpdated || !this.state.clickedBoundary || !this.state.resizeOldBounds)
					break

				let newBounds = {
					min: Object.assign({}, this.state.resizeOldBounds.min),
					max: Object.assign({}, this.state.resizeOldBounds.max)
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
						// Moving
						if (!this.state.mouseDownPos)
							break
						const mouseDelta = Matter.Vector.sub(mousePos, this.state.mouseDownPos)
						newBounds.min = Matter.Vector.add(newBounds.min, mouseDelta)
						newBounds.max = Matter.Vector.add(newBounds.max, mouseDelta)
						break
				}

				// Fixup so that min is always at the top left and max is always at the bottom right
				newBounds = createBounds(newBounds.min, newBounds.max)

				// Update cursor
				this.updateCanvasCursorStyle(this.state.resizeMode, this.state.clickedBoundary)

				this.props.onBoundaryUpdated(this.state.clickedBoundary.index, newBounds)
				break
			}

			default: break
		}
	}

	onMouseOver = (event: React.MouseEvent<HTMLCanvasElement>) => {
		// Show crosshair and coords
		this.setState({ showCrosshair: true })
	}

	onMouseOut = (event: React.MouseEvent<HTMLCanvasElement>) => {
		this.setState({
			// Hide crosshair and coords
			showCrosshair: false,

			// Clear drawing/resizing state
			mouseDownPos: undefined,
			clickedBoundary: undefined
		})
	}

	onWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
		if (!this.matterMouse || !this.matterRender)
			return
		
		const mouse = this.matterMouse
		const zoomFactor = event.deltaY < 0 ? 0.9 : 1 / 0.9
		const bounds = this.matterRender.bounds

		// Reposition viewport
		bounds.min.x = zoomFactor * (bounds.min.x - mouse.position.x) + mouse.position.x
		bounds.min.y = zoomFactor * (bounds.min.y - mouse.position.y) + mouse.position.y
		bounds.max.x = zoomFactor * (bounds.max.x - mouse.position.x) + mouse.position.x
		bounds.max.y = zoomFactor * (bounds.max.y - mouse.position.y) + mouse.position.y
	}

	spawnRandomObjects = (count: number) => {
		if (!this.matterRender || !this.matterWorld)
			return
	
		let bodies = []
		for (let i = 0; i < count; ++i) {
			const x = random(this.matterRender.bounds.min.x, this.matterRender.bounds.max.x, true)
			const y = random(this.matterRender.bounds.min.y, this.matterRender.bounds.max.y, true)
			bodies.push(Matter.Bodies.circle(x, y, 10, { restitution: 0.5 }))
		}

		Matter.World.add(this.matterWorld, bodies)
	}

	clearAllObjects = () => {
		if (!this.matterMouseConstraint || !this.matterWorld)
			return

		// Remove the bodies
		Matter.World.clear(this.matterWorld, false)

		// Re-add mouse constraint
		Matter.World.add(this.matterWorld, this.matterMouseConstraint)
	}

	showAllObjects = () => {
		if (!this.matterWorld)
			return

		if (this.matterWorld.bodies.length > 0)
			RenderAuraProj.lookAt(this.matterRender, this.matterWorld.bodies, {x: 50, y: 50}, true)
	}

	resetView = () => {
		if (!this.state.canvasRef.current || !this.matterRender)
			return

		const canvas = this.state.canvasRef.current
		const render = this.matterRender

		let halfExtent = {x: canvas.width / 2, y: canvas.height / 2} as Matter.Vector
		render.bounds.min = Matter.Vector.neg(halfExtent)
		render.bounds.max = halfExtent
	}

	// Convert a position in world space to canvas space
	worldToCanvas = (position: Point) => {
		if (!this.matterRender)
			return {x: 0, y: 0} as Point

		const render = this.matterRender
		const scale = render.canvas.width / (render.bounds.max.x - render.bounds.min.x)
		return Matter.Vector.mult(Matter.Vector.sub(position, render.bounds.min), scale)
	}

	boundaryUnderMouse = (): BoundaryMouseInfo | undefined => {
		if (!this.matterMouse)
			return undefined

		for (let i = 0; i < this.props.boundaries.length; ++i) {
			const boundary = this.props.boundaries[i]
			if (pointInBounds(this.matterMouse.position, boundary.bounds)) {
				return {index: i, bounds: boundary.bounds} as BoundaryMouseInfo
			}
		}

		return undefined
	}

	bodyAtPosition = (position: Point) => {
		if (!this.matterWorld)
			return

		const allBodies = Matter.Composite.allBodies(this.matterWorld)
		const bodies = Matter.Query.point(allBodies, position)
		return bodies[0]
	}

	// Get position of mouse in canvas or world space (snapped to grid if necessary)
	getMousePos = (canvas = false, forceUnsnapped = false) => {
		if (!this.matterMouse)
			return {x: 0, y: 0} as Point

		const gridSize = this.props.gridSize
		const mousePos = Object.assign({}, this.matterMouse.position) as Point

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
					ref={this.state.canvasRef}
					onMouseDown={this.onMouseDown}
					onMouseUp={this.onMouseUp}
					onMouseMove={this.onMouseMove}
					onMouseOver={this.onMouseOver}
					onMouseOut={this.onMouseOut}
					onWheel={this.onWheel}
				/>
			</div>
		)
	}
}
