interface Point {
	x: number,
	y: number
}

interface Bounds {
	min: Point,
	max: Point
}

interface Boundary {
	bounds: Bounds,
	vars: {
		[propname: string]: number
	},
	color: string,
}

interface BoundaryResizeInfo {
	boundary: Boundary,
	newBounds: Bounds
}

interface UtilityConstants {
	[propname: string]: number
}

interface UtilityVariables {
	[propname: string]: number
}

interface UtilityFunction {
	expression: string,
	evalFunc?: function,
}

interface SubUtilityFunction extends UtilityFunction {
	utilVar: string,
	color?: string
}

interface Variable {
	desc: string,
	type?: string,
	defaultValue?: number
}

interface Variables {
	[propname: string]: Variable
}

interface ExportState {
	boundaries: Array<Boundary>,
	utilFunctions: Array<SubUtilityFunction>,
	utilConstants: UtilityVariables,
	utilGlobalVars: UtilityVariables,
	utilServer: UtilityFunction
}

interface ExportBody {
	inverseMass: number,
	mass: number,
	position: Matter.Vector,
	speed: number,
	velocity: Matter.Vector,
	vertices: Array<Matter.Vector>
}

interface ExportData {
	simState?: ExportState,
	bodies?: Array<ExportBody>
}

// Callbacks
type ChangeColorClickedCallback = (index?: number) => void
type ColorUpdatedCallback = (color: ReactColor.ColorResult) => void

type UtilFuncAddedCallback = () => void
type UtilFuncDeletedCallback = (index: number) => void
type UtilFuncExpressionUpdatedCallback = (index: number, value: string) => void
type ServerUtilFuncExpressionUpdatedCallback = (value: string) => void
type UtilFuncVarUpdatedCallback = (index: number, value: string) => void
type UtilConstantUpdatedCallback = (string: key, value: number) => void

type ObjectAddedCallback = (body: Matter.Body) => void
type ObjectDeletedCallback = (id: number) => void
type BoundaryAddedCallback = (bounds: Bounds) => void
type BoundariesUpdatedCallback = (boundaries: Array<BoundaryResizeInfo>, validate?: boolean) => void
type BoundaryDeletedCallback = (boundary: Boundary) => void

type ImportClickedCallback = () => void
type ExportClickedCallback = () => void
type FilesSelectedCallback = (fileList: FileList) => void
