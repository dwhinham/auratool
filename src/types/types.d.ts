interface Point {
    x: number,
    y: number
}

interface Boundary {
    min: Point,
    max: Point,
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
    evalFunc: function,
    utilVar: string,
    color: string
}