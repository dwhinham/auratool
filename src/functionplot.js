import { defaults, Scatter } from 'react-chartjs-2'
import React, { Component } from 'react'
import Slider from 'react-input-slider'

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

    onRelayout = layout => {
        if (layout.hasOwnProperty('dragmode')) {
            this.setState({
                dragmode: layout.dragmode
            })
        }
        else if (layout.hasOwnProperty('xaxis.range[0]')) {
            this.setState({
                xRange: [layout['xaxis.range[0]'], layout['xaxis.range[1]']],
                yRange: [layout['yaxis.range[0]'], layout['yaxis.range[1]']]
            })
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
                label: func.expression,
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
                    const { [func.plotVar]: _, ...varsWithoutPlotVar } = evalVars

                    const y = func.evalFunc({
                        [func.plotVar]: x,

                        // Constants
                        e: Math.E,
                        pi: Math.PI,

                        // Variable values
                        ...varsWithoutPlotVar
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

    updatePoints = memoize((funcs, vars) => {
        var datasets = []

        // Coerce the variables array into the right format for evaluatex
        var evalVars = {}
        Object.keys(vars).forEach(key => evalVars[key] = vars[key].value)

        funcs.forEach(func => {
            if (!func.evalFunc || func.plotVar === 'x')
                return

            try {
                const { [func.plotVar]: plotVar, ...varsWithoutPlotVar } = evalVars

                const x = evalVars[func.plotVar]
                const y = func.evalFunc({
                    [func.plotVar]: x,

                    // Constants
                    e: Math.E,
                    pi: Math.PI,

                    // Variable values
                    ...varsWithoutPlotVar
                })

                datasets.push({
                    label: func.plotVar,
                    fill: true,
                    showLine: false,
                    pointRadius: 6,
                    hoverRadius: 8,
                    pointStyle: 'circle',
                    pointHitRadius: 2,
                    backgroundColor: func.color,
                    borderColor: func.color,
                    data: [{x, y}]
                })
            } catch(e) {
                // Skip this function
            }
        })

        return datasets
    })

    onRangeSliderChanged = value => {
        this.setState({x: value.x})
    }

    render() {
        const curves = this.updateCurves(this.props.functions, this.props.vars, this.state.xRange)
        const points = this.updatePoints(this.props.functions, this.props.vars)
        const data = { datasets: curves.concat(points) }

        return (
            <Scatter
                data = { data }
                width={ this.state.width }
                height={ this.state.height }
                options={{ maintainAspectRatio: false }}
            />
        );
    }
}
