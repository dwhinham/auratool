import { defaults, Scatter } from 'react-chartjs-2'
import React, { Component } from 'react'

import memoize from 'memoize-one'

import Util from './util'

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
    updateCurves = memoize((funcs, constants, globalVars) => {
        const numSteps = 100
        const stepSize = (this.state.xRange[1] - this.state.xRange[0]) / numSteps

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
                    const y = func.evalFunc({
                        [func.utilVar]: x,

                        // Non-boundary variables
                        ...constants,
                        ...globalVars
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

    updatePoints = memoize((boundaries, funcs, constants, globalVars) => {
        var datasets = []

            funcs.forEach(func => {
                if (!func.evalFunc || func.utilVar === 'x')
                    return

                try {
                boundaries.forEach((b, i) => {
                    const x = b.vars[func.utilVar]
                    const y = Util.evaluateUtilFunction(func, b, constants, globalVars)

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
                })
                } catch(e) {
                    // Skip this function
                }
            })

        return datasets
    })

    render() {
        const curves = this.updateCurves(this.props.utilFunctions, this.props.utilConstants, this.props.utilGlobalVars)
        const points = this.updatePoints(this.props.boundaries, this.props.utilFunctions, this.props.utilConstants, this.props.utilGlobalVars)
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
