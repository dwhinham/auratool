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
type BoundaryUpdatedCallback = (boundary: Boundary, newBounds: Bounds, validate?: boolean) => void
type BoundaryDeletedCallback = (boundary: Boundary) => void
