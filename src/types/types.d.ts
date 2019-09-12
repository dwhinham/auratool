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
    vars: any,
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
    evalFunc: function,
    utilVar: string,
    color: string
}