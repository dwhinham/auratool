const Util = {
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    round(value, digits) {
        return Number.isInteger(value) ? value : Number.parseFloat(value).toFixed(digits)
    }
}

export default Util;