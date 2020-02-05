///<reference path="./types/types.d.ts" />

export const createBounds = (p1: Vector2D, p2: Vector2D) => {
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

export const circleOverlapBounds = (p: Vector2D, r: number, b: Bounds) => {
	const bHalfWidth = (b.max.x - b.min.x) / 2
	const bHalfHeight = (b.max.y - b.min.y) / 2
	const bCenter = {
		x: b.min.x + bHalfWidth,
		y: b.min.y + bHalfHeight
	}
	const dist = {
		x: Math.abs(p.x - bCenter.x),
		y: Math.abs(p.y - bCenter.y)
	}

	if (dist.x > bHalfWidth + r) return false
	if (dist.y > bHalfHeight + r) return false

	if (dist.x <= bHalfWidth) return true
	if (dist.y <= bHalfHeight) return true

	const cornerDistSq = Math.pow(dist.x - bHalfWidth, 2) + Math.pow(dist.y - bHalfHeight, 2)
	return cornerDistSq <= Math.pow(r, 2)
}

export const distanceSq = (p1: Vector2D, p2: Vector2D) => {
	const dx = p1.x - p2.x
	const dy = p1.y - p2.y
	return dx * dx + dy * dy
}

export const pointInBounds = (p: Vector2D, b: Bounds, includeEdges: boolean = true) => {
	if (includeEdges)
		return p.x >= b.min.x && p.x <= b.max.x && p.y >= b.min.y && p.y <= b.max.y
	else
		return p.x > b.min.x && p.x < b.max.x && p.y > b.min.y && p.y < b.max.y
}

export const pointNearBounds = (p: Vector2D, r: number, b: Bounds) => {
	return  p.x - r < b.min.x ||
			p.x + r > b.max.x ||
			p.y - r < b.min.y ||
			p.y + r > b.max.y
}

export const resizeBounds2WaySplit = (boundaries: Array<Boundary>, mousePos: Vector2D, vertical: boolean) => {

}

export const resizeBounds4WaySplit = (boundaries: Array<Boundary>, mousePos: Vector2D) => {

}

export const evaluateUtilFunction = (func: SubUtilityFunction, boundary: Boundary, constants: UtilityVariables, globalVars: UtilityVariables) => {
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

export const evaluateServerUtilFunction = (serverUtilFunc: UtilityFunction, utilFuncs: Array<SubUtilityFunction>, boundary: Boundary, constants: UtilityVariables, globalVars: UtilityVariables) => {
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