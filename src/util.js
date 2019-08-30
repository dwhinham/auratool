const Util = {}

export default Util

Util.createBounds = (p1, p2) => {
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

Util.boundsOverlap = (b1, b2) => !(b2.min.x >= b1.max.x || b2.max.x <= b1.min.x || b2.max.y <= b1.min.y || b2.min.y >= b1.max.y)

Util.pointInBounds = (p, b, includeEdges = true) => {
    if (includeEdges)
        return p.x >= b.min.x && p.x <= b.max.x && p.y >= b.min.y && p.y <= b.max.y
    else
        return p.x > b.min.x && p.x < b.max.x && p.y > b.min.y && p.y < b.max.y
}