///<reference path="./types/types.d.ts" />

import { cloneDeep } from 'lodash'

import evaluatex from 'evaluatex/dist/evaluatex'
import { saveAs } from 'file-saver'
import { get, set } from 'local-storage'
import Matter from 'matter-js'
import * as React from 'react'
import * as ReactColor from 'react-color'

import ControlPanel from './components/ControlPanel'
import FunctionPlot from './components/FunctionPlot'
import Header from './components/Header'
import ImportModal from './components/ImportModal'
import PhysicsSim, { MouseMode } from './components/PhysicsSim'
import PhysicsToolbar from './components/PhysicsToolbar'

import { ControlsContainer, ColumnFlexContainer, RowFlexContainer, FillParentFlexItem } from './Layout'
import { boundsOverlap, createExportFilename, pointInBounds, pointNearBounds } from './Utility'
import { constants } from './Variables'

const colors = [
	'#e6194b',
	'#3cb44b',
	'#4363d8',
	'#f58231',
	'#911eb4',
	'#46f0f0',
	'#f032e6',
	'#bcf60c',
	'#fabebe',
	'#008080',
	'#e6beff',
	'#9a6324',
	'#fffac8',
	'#800000',
	'#aaffc3',
	'#808000',
	'#ffd8b1',
	'#000075',
	'#808080',
	'#ffe119',
	'#ffffff',
	'#000000'
]

const A_VERY_BIG_NUMBER = 100000

interface AppState {
	// UI
	showColorPicker: boolean,
	showImportModal: boolean,
	colorIndex?: number,
	lastBoundaryMoveTime: number,
	mouseMode: MouseMode,
	gridSize: number,
	snapToGrid: boolean,

	// Simulation
	boundaries: Array<Boundary>,
	utilFunctions: Array<SubUtilityFunction>,
	utilConstants: UtilityVariables,
	utilGlobalVars: UtilityVariables,
	utilServer: UtilityFunction
}

export default class App extends React.Component<{}, AppState> {
	physicsSimRef: React.RefObject<PhysicsSim>
	lastFrameTime: number
	frameTimeHistory: Array<number>

	constructor(props: {}) {
		super(props)

		const defaultConstantValues: UtilityVariables = {}
		Object.keys(constants).forEach((key) => defaultConstantValues[key] = constants[key].defaultValue as number)

		this.physicsSimRef = React.createRef()
		this.lastFrameTime = 0
		this.frameTimeHistory = new Array(10)

		const localStorageState = get<AppState>('utilSim')
		if (localStorageState) {
			console.log('Loading settings from local storage')
			this.state = localStorageState
			return
		}

		console.log('Using default settings')
		this.state = {
			showColorPicker: false,
			showImportModal: false,
			colorIndex: 0,
			lastBoundaryMoveTime: window.performance.now(),

			mouseMode: MouseMode.OBJECT,
			gridSize: 50,
			snapToGrid: false,

			boundaries: [
				{
					bounds: { min: {x: 0, y: -A_VERY_BIG_NUMBER}, max: {x: A_VERY_BIG_NUMBER, y: 0} },
					color: colors[0],
					vars: {}
				},
				{
					bounds: { min: {x: 0, y: 0}, max: {x: A_VERY_BIG_NUMBER, y: A_VERY_BIG_NUMBER} },
					color: colors[1],
					vars: {}
				},
				{
					bounds: { min: {x: -A_VERY_BIG_NUMBER, y: -0}, max: {x: 0, y: A_VERY_BIG_NUMBER} },
					color: colors[2],
					vars: {}
				},
				{
					bounds: { min: {x: -A_VERY_BIG_NUMBER, y: -A_VERY_BIG_NUMBER}, max: {x: 0, y: 0} },
					color: colors[3],
					vars: {}
				}
			],

			utilFunctions: [
				{
					expression: "e^(-10alpha)",
					utilVar: "alpha",
					color: colors[5]
				},
				{
					expression: "e^(-5beta)",
					utilVar: "beta",
					color: colors[6]
				},
				{
					expression: "min(max(0, -log(delta, 1000/60)), 1)",
					utilVar: "delta",
					color: colors[7]
				}
			],
			utilConstants: defaultConstantValues,
			utilGlobalVars: {},
			utilServer: {
				expression: "U_alpha + U_beta + U_delta"
			}
		}
	}

	componentDidMount = () => {
		// Try to compile the functions
		this.state.utilFunctions.forEach((func, i) => this.onUtilFunctionUpdated(i, func.expression))
		this.onServerUtilFunctionUpdated(this.state.utilServer.expression)
	}

	onEngineBeforeUpdate = (event: Matter.IEventTimestamped<Matter.Engine>) => {
		this.lastFrameTime = window.performance.now()
	}

	onEngineAfterUpdate = (event: Matter.IEventTimestamped<Matter.Engine>) => {
		// Update timing metrics
		const now = window.performance.now()
		const delta = (now - this.lastFrameTime)
		this.frameTimeHistory.push(delta)
		this.frameTimeHistory.shift()
		const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length

		const boundaries = this.state.boundaries.slice()
		const allBodies = Matter.Composite.allBodies(event.source.world)
		const totalObjects = allBodies.length

		// Update boundary-local vars
		boundaries.forEach(b => {
			var numObjects = 0
			var numNearBoundary = 0
			var numActive = 0

			var i = 0
			while (i < allBodies.length) {
				const body = allBodies[i]
				if (!pointInBounds(body.position, b.bounds, true)) {
					++i
					continue
				}

				// Update counters
				++numObjects

				// Is it active?
				if (!body.isSleeping)
					++numActive

				// Is the object near any of the boundary edges?
				if (pointNearBounds(body.position, body.circleRadius as number, b.bounds))
					++numNearBoundary

				// Make object same colour as boundary that contains it
				body.render.fillStyle = b.color

				// Remove from 'all objects array'
				allBodies.splice(i, 1)
			}

			// Fake CPU usage (we can't get real CPU usage in JS)
			b.vars.lambda = (numObjects ? Math.min(1.0, numActive / totalObjects) : 0) + Math.random() * 0.1
			b.vars.delta = avgFrameTime
			b.vars.alpha = numObjects ? numActive / numObjects : 0
			b.vars.beta = numObjects ? numNearBoundary / numObjects : 0
			b.vars.n = numObjects
		})

		// Color remaining bodies (not in any boundary, which is something that should never happen) black
		allBodies.forEach(b => b.render.fillStyle = 'black')

		// Update global vars
		const timeSinceBoundaryMoved = (now - this.state.lastBoundaryMoveTime) / 1000
		const utilGlobalVars = {
			sigma: boundaries.length,
			t: timeSinceBoundaryMoved,
			N: totalObjects
		}

		this.setState({ boundaries, utilGlobalVars })
	}

	// Validate the bounds
	validateResize = (resizeInfo: Array<BoundaryResizeInfo>) => {
		// Get the boundaries not being updated
		var notBeingUpdated: Bounds[] = []
		this.state.boundaries.forEach(b => {
			if (!resizeInfo.some(r => r.boundary === b))
				notBeingUpdated.push(b.bounds)
		})

		return resizeInfo.every(info => {
			const bounds = info.newBounds

		// Reject min == max
		if (bounds.min.x === bounds.max.x || bounds.min.y === bounds.max.y)
			return false

			// Combine check list with boundaries being updated
			const checkList = [...notBeingUpdated]
			resizeInfo.forEach(r => (r !== info) && checkList.push(r.newBounds))

			// Reject overlapping boundaries
			return !checkList.some(b => boundsOverlap(bounds, b))
		})
	}

	validateBoundary = (bounds: Bounds, boundaryToIgnore?: Boundary) => {
		// Reject min == max
		if (bounds.min.x === bounds.max.x || bounds.min.y === bounds.max.y)
			return false

		// Reject overlapping boundaries
		return this.state.boundaries.every(boundary => {
			// Prevent comparison against self
			if (boundary === boundaryToIgnore)
				return true

			// Check it doesn't overlap
			return !boundsOverlap(bounds, boundary.bounds)
		})
	}

	onBoundaryAdded = (bounds: Bounds) => {
		if (!this.validateBoundary(bounds))
			return

		var boundaries = this.state.boundaries.slice()
		boundaries.push({
			bounds: bounds,
			color: colors[boundaries.length % colors.length],
			vars: {}
		})
		this.setState({ boundaries, lastBoundaryMoveTime: window.performance.now() })
	}

	onBoundaryDeleted = (boundary: Boundary) => {
		const index = this.state.boundaries.findIndex(b => b === boundary)
		if (index === -1)
			return

		var boundaries = this.state.boundaries.slice()
		boundaries.splice(index, 1)
		this.setState({ boundaries, lastBoundaryMoveTime: window.performance.now() })
	}

	onBoundariesUpdated = (resizeInfo: Array<BoundaryResizeInfo>, validate: boolean = true) => {
		if (validate && !this.validateResize(resizeInfo))
			return

		const boundaries = this.state.boundaries.slice()
		resizeInfo.forEach(info => {
			// Find the right boundary object to to update
			for (let i = 0; i < boundaries.length; ++i) {
				if (info.boundary !== boundaries[i])
					continue

				const oldBounds = boundaries[i].bounds
				oldBounds.min.x = info.newBounds.min.x
				oldBounds.min.y = info.newBounds.min.y
				oldBounds.max.x = info.newBounds.max.x
				oldBounds.max.y = info.newBounds.max.y
				break
			}
		})

		this.setState({
			boundaries,
			lastBoundaryMoveTime: window.performance.now()
		})
	}

	onUtilFunctionUpdated = (index: number, value: string) => {
		const utilFunctions = this.state.utilFunctions.slice()
		utilFunctions[index].expression = value

		// Try to compile the function
		try {
			utilFunctions[index].evalFunc = evaluatex(value, { e: Math.E, pi: Math.PI })
		} catch {
			utilFunctions[index].evalFunc = null
		}

		this.setState({ utilFunctions })
	}

	onServerUtilFunctionUpdated = (value: string) => {
		const utilServer = cloneDeep(this.state.utilServer)
		utilServer.expression = value

		// Try to compile the function
		try {
			utilServer.evalFunc = evaluatex(value, { e: Math.E, pi: Math.PI })
		} catch {
			utilServer.evalFunc = undefined
		}

		this.setState({ utilServer })
	}

	onUtilConstantUpdated = (key: string, value: number) => {
		const utilConstants = cloneDeep(this.state.utilConstants)
		utilConstants[key] = value
		this.setState({ utilConstants })
	}

	onUtilVarUpdated = (index: number, value: string) => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions[index].utilVar = value
		this.setState({ utilFunctions })
	}

	onUtilFunctionAdded = () => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions.push({
			expression: "",
			utilVar: "x",
			color: colors[utilFunctions.length % colors.length]
		})
		this.setState({ utilFunctions })
	}

	onUtilFunctionDeleted = (index: number) => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions.splice(index, 1)
		this.setState({ utilFunctions })
	}

	onChangeColorClicked = (index?: number) => {
		this.setState({
			showColorPicker: !this.state.showColorPicker,
			colorIndex: !this.state.showColorPicker ? index : undefined
		})
	}

	onColorUpdated = (color: ReactColor.ColorResult) => {
		let utilFunctions = this.state.utilFunctions.slice()
		utilFunctions[this.state.colorIndex as number].color = color.hex
		this.setState({ utilFunctions })
	}

	onRandomClicked = () => {
		if (!this.physicsSimRef.current)
			return;
		this.physicsSimRef.current.spawnRandomObjects(100)
	}

	onClearClicked = () => {
		if (!this.physicsSimRef.current)
			return;
		this.physicsSimRef.current.clearAllObjects()
	}

	onHomeClicked = () => {
		if (!this.physicsSimRef.current)
			return;
		this.physicsSimRef.current.resetView()
	}

	onShowAllObjectsClicked = () => {
		if (!this.physicsSimRef.current)
			return;
		this.physicsSimRef.current.showAllObjects()
	}

	onImportClicked = () => {
		this.setState({ showImportModal: true })
	}

	onImportModalClosed = () => {
		this.setState({ showImportModal: false })
	}

	onExportClicked = () => {
		let saveObj: ExportData = {
			simState: {
				boundaries: this.state.boundaries,
				utilFunctions: this.state.utilFunctions,
				utilConstants: this.state.utilConstants,
				utilGlobalVars: this.state.utilGlobalVars,
				utilServer: this.state.utilServer
			}
		}

		if (this.physicsSimRef.current && this.physicsSimRef.current.matterWorld) {
			const matterWorld = this.physicsSimRef.current.matterWorld
			const allBodies = Matter.Composite.allBodies(matterWorld)

			// TODO: Make this object typed
			const bodies: Array<ExportBody> = allBodies.map(body => { 
				let bodyData: ExportBody = {
					inverseMass: body.inverseMass,
					mass: body.mass,
					position: body.position,
					speed: body.speed,
					velocity: body.velocity,
				}

				// Export only radius if object is a circle
				if (body.circleRadius)
					bodyData.circleRadius = body.circleRadius
				// Otherwise export all vertices
				else
					bodyData.vertices = body.vertices.map(vertex => {
						return Matter.Vector.create(vertex.x, vertex.y)
					})

				return bodyData
			})

			//set('bodies', bodies)
			saveObj.bodies = bodies
		}

		//set('utilSim', this.state)
		saveAs(new Blob([JSON.stringify(saveObj)]), createExportFilename())
	}

	onFilesSelected = (fileList: FileList) => {
		const file = fileList[0]

		let reader = new FileReader()
		reader.readAsBinaryString(file)
		reader.onloadend = () => {
			const newState = JSON.parse(reader.result as string) as ExportData

			// Load boundary/function state
			if (newState.simState)
				this.setState(newState.simState)

			// Load bodies
			if (newState.bodies && this.physicsSimRef.current && this.physicsSimRef.current.matterWorld) {
				const matterWorld = this.physicsSimRef.current.matterWorld
				newState.bodies.forEach(bodyData => {
					let body: Matter.Body

					if (bodyData.circleRadius)
						body = Matter.Bodies.circle(bodyData.position.x, bodyData.position.y, bodyData.circleRadius, bodyData)
					else
						body = Matter.Body.create(bodyData)

					// We need to do this so Matter intializes previousPosition so that
					// velocity is applied properly and the object resumes movement.
					Matter.Body.setVelocity(body, body.velocity)

					Matter.World.add(matterWorld, body)
				})
			}

			// Close dialog
			this.setState({ showImportModal: false })
		}
	}

	render = () => {
		return (
			<ColumnFlexContainer>
				<ImportModal
					show={ this.state.showImportModal }
					onFilesSelected={ this.onFilesSelected }
					onHide={ this.onImportModalClosed }
					onClosed={ this.onImportModalClosed }
				/>
		
				<Header
					onImportClickedCallback={ this.onImportClicked }
					onExportClickedCallback={ this.onExportClicked }
				/>

				<RowFlexContainer>
					<FillParentFlexItem>
						<ControlsContainer>
							<PhysicsToolbar
								mouseMode={this.state.mouseMode}
								snapToGrid={this.state.snapToGrid}
								onMouseModeChanged={(mouseMode) => { this.setState({mouseMode}) }}
								onHomeClicked={this.onHomeClicked}
								onShowAllObjectsClicked={this.onShowAllObjectsClicked}
								onRandomClicked={this.onRandomClicked}
								onClearClicked={this.onClearClicked}
								onSnapToGridChanged={(snapToGrid) => { this.setState({snapToGrid}) }}
								onIncreaseGridSizeClicked={() => { this.setState({gridSize: this.state.gridSize * 2}) }}
								onDecreaseGridSizeClicked={() => { this.setState({gridSize: Math.max(25, this.state.gridSize / 2)}) }}
							/>
						</ControlsContainer>
						<PhysicsSim
							ref={this.physicsSimRef}
							boundaries={this.state.boundaries}

							// State
							gridSize={this.state.gridSize}
							mouseMode={this.state.mouseMode}
							snapToGrid={this.state.snapToGrid}

							// Callbacks
							onBoundaryAdded={this.onBoundaryAdded}
							onBoundariesUpdated={this.onBoundariesUpdated}
							onBoundaryDeleted={this.onBoundaryDeleted}

							onEngineBeforeUpdate={this.onEngineBeforeUpdate}
							onEngineAfterUpdate={this.onEngineAfterUpdate}
						/>
					</FillParentFlexItem>
					<FillParentFlexItem>
						<FunctionPlot
							boundaries={this.state.boundaries}
							utilFunctions={this.state.utilFunctions}
							utilConstants={this.state.utilConstants}
							utilGlobalVars={this.state.utilGlobalVars}
						/>
					</FillParentFlexItem>
					<ControlPanel
						// Physics state
						boundaries={this.state.boundaries}

						// Utility state
						utilFunctions={this.state.utilFunctions}
						utilConstants={this.state.utilConstants}
						utilGlobalVars={this.state.utilGlobalVars}
						utilServer={this.state.utilServer}

						// Control panel callbacks
						onUtilFunctionUpdated={this.onUtilFunctionUpdated}
						onUtilFunctionAdded={this.onUtilFunctionAdded}
						onUtilFunctionDeleted={this.onUtilFunctionDeleted}
						onServerUtilFunctionUpdated={this.onServerUtilFunctionUpdated}
						onUtilConstantUpdated={this.onUtilConstantUpdated}
						onUtilVarUpdated={this.onUtilVarUpdated}
						onChangeColorClicked={this.onChangeColorClicked}
						onColorUpdated={this.onColorUpdated}
						showColorPicker={this.state.showColorPicker}
						colorIndex={this.state.colorIndex}
					/>
				</RowFlexContainer>
			</ColumnFlexContainer>
		)
	}
}
