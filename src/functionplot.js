import { defaults, Scatter } from 'react-chartjs-2'
import React, { Component } from 'react'

import memoize from 'memoize-one'

export default class FunctionPlot extends Component {
    constructor(props) {
        super(props)

        // Setup chart.js defaults
        defaults.global.animation = false
        defaults.global.borderWidth = 2

        this.state = {
            width: props.width,
            height: props.height,
            dataSet: [],
            xRange: [0, 1],
            yRange: [0, 1],
            dragmode: 'pan',
            x: 0
        }
    }

    // Memoized function returns cached results when arguments are the same as the last call
    updateCurves = memoize((funcs, vars, xRange) => {
        const numSteps = 100
        const stepSize = (xRange[1] - xRange[0]) / numSteps

        // Coerce the variables array into the right format for evaluatex
        var evalVars = {}
        Object.keys(vars).forEach(key => evalVars[key] = vars[key].value)

        // Plot curves
        var datasets = []
        funcs.forEach(func => {
            if (!func.evalFunc)
                return

            var dataset = {
                label: `U(${func.utilVar})`,
                fill: false,
                showLine: true,
                pointRadius: 0,
                pointHitRadius: 2,
                backgroundColor: func.color,
                borderColor: func.color,
                data: new Array(numSteps),
            }

            try {
                for (var x = this.state.xRange[0]; x <= this.state.xRange[1]; x += stepSize) {
                    // Don't pass in the emove the 
                    const { [func.utilVar]: _, ...varsWithoutUtilVar } = evalVars

                    const y = func.evalFunc({
                        [func.utilVar]: x,

                        // Constants
                        e: Math.E,
                        pi: Math.PI,

                        // Variable values
                        ...varsWithoutUtilVar
                    })

                    dataset.data.push({x, y})
                }
                datasets.push(dataset)
            } catch(e) {
                // Skip this function
            }
        })

        return datasets
    })

    updatePoints = memoize((funcs, vars, boundaries) => {
        var datasets = []

        boundaries.forEach((b, i) => {
            // Coerce the variables array into the right format for evaluatex
            var evalVars = {}
            Object.keys(b.vars).forEach(key => evalVars[key] = b.vars[key])

            funcs.forEach(func => {
                if (!func.evalFunc || func.utilVar === 'x')
                    return

                try {
                    const { [func.utilVar]: utilVar, ...varsWithoutUtilVar } = evalVars

                    const x = evalVars[func.utilVar]
                    const y = func.evalFunc({
                        [func.utilVar]: x,

                        // Constants
                        e: Math.E,
                        pi: Math.PI,

                        // Variable values
                        ...varsWithoutUtilVar
                    })

                    datasets.push({
                        label: `B${i} U(${func.utilVar})`,
                        fill: true,
                        showLine: false,
                        pointRadius: 6,
                        hoverRadius: 8,
                        pointStyle: 'circle',
                        pointHitRadius: 2,
                        backgroundColor: b.color,
                        borderColor: func.color,
                        data: [{x, y}]
                    })
                } catch(e) {
                    // Skip this function
                }
            })
        })

        return datasets
    })

    render() {
        const curves = this.updateCurves(this.props.functions, this.props.vars, this.state.xRange)
        const points = this.updatePoints(this.props.functions, this.props.vars, this.props.boundaries)
        const data = { datasets: points.concat(curves) }

        return (
            <Scatter
                data={ data }
                width={ this.state.width }
                height={ this.state.height }
                options={{ maintainAspectRatio: false }}
            />
        );
    }
}
