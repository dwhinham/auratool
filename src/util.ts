///<reference path="./types/types.d.ts" />

export const createBounds = (p1: Point, p2: Point) => {
    return {
        min: {
            x: Math.min(p1.x, p2.x),
            y: Math.min(p1.y, p2.y),
        },
        max: {
            x: Math.max(p1.x, p2.x),
            y: Math.max(p1.y, p2.y),
        }
    }
}

export const boundsOverlap = (b1: Bounds, b2: Bounds) => !(b2.min.x >= b1.max.x || b2.max.x <= b1.min.x || b2.max.y <= b1.min.y || b2.min.y >= b1.max.y)

export const pointInBounds = (p: Point, b: Bounds, includeEdges: boolean = true) => {
    if (includeEdges)
        return p.x >= b.min.x && p.x <= b.max.x && p.y >= b.min.y && p.y <= b.max.y
    else
        return p.x > b.min.x && p.x < b.max.x && p.y > b.min.y && p.y < b.max.y
}

export const objectNearBoundary = (position: Point, radius: number, bounds: Bounds) => {
    return  position.x - radius < bounds.min.x ||
            position.x + radius > bounds.max.x ||
            position.y - radius < bounds.min.y ||
            position.y + radius > bounds.max.y
}

export const evaluateUtilFunction = (func: UtilityFunction, boundary: Boundary, constants: UtilityVariables, globalVars: UtilityVariables) => {
    try {
        return func.evalFunc({
            [func.utilVar]: boundary.vars[func.utilVar],
    
            // Non-boundary variables
            ...constants,
            ...globalVars
        })
    } catch {
        return 0
    }
}

export const evaluateServerUtilFunction = (serverUtilFunc: UtilityFunction, utilFuncs: Array<UtilityFunction>, boundary: Boundary, constants: UtilityVariables, globalVars: UtilityVariables) => {
    if (!serverUtilFunc.evalFunc)
        return 0

    const utilValues = {...boundary.vars, ...constants, ...globalVars}
    utilFuncs.forEach(func => {
        if (!func.evalFunc || func.utilVar === 'x')
            return
        utilValues[`U_${func.utilVar}`] = evaluateUtilFunction(func, boundary, constants, globalVars)
    })

    try {
        return serverUtilFunc.evalFunc(utilValues)
    } catch(e) {
        return 0
    }
}