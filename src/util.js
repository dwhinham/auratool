const Util = {
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
}

export default Util;