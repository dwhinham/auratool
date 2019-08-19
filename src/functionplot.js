import Plot from 'react-plotly.js';
import React, { Component } from 'react'

import memoize from 'memoize-one'

export default class FunctionPlot extends Component {
    constructor(props) {
        super(props)
        this.state = {
            width: props.width,
            height: props.height,
            dataSet: [],
            xRange: [0, 1],
            yRange: [0, 1],
            dragmode: 'pan'
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
    updateCurves = memoize((funcs, xRange) => {
        const numSteps = 100
        const stepSize = (xRange[1] - xRange[0]) / (numSteps - 1)

        // Coerce the variables array into the right format for evaluatex
        var evalVars = {}
        Object.keys(this.props.vars).forEach(key => evalVars[key] = this.props.vars[key].value)

        // Plot curves
        var dataSet = []
        funcs.forEach(func => {
            if (!func.evalFunc)
                return

            try {
                var data = {
                    x: new Array(numSteps),
                    y: new Array(numSteps),
                    mode: 'lines',
                    type: 'scatter',
                    marker: { color: func.color },
                    name: func.expression
                }

                for (var x = this.state.xRange[0]; x <= this.state.xRange[1] + stepSize; x += stepSize) {
                    // Don't pass in the emove the 
                    const { [func.plotVar]: _, ...varsWithoutPlotVar } = evalVars

                    const result = func.evalFunc({
                        [func.plotVar]: x,

                        // Constants
                        e: Math.E,
                        pi: Math.PI,

                        // Variable values
                        ...varsWithoutPlotVar
                    })

                    data.x.push(x)
                    data.y.push(result)
                }
                dataSet.push(data)
            } catch(e) {
                // Skip this function
            }
        })

        return dataSet
    })

    updatePoints = memoize((funcs, vars) => {
        var dataSet = []

        // Coerce the variables array into the right format for evaluatex
        var evalVars = {}
        Object.keys(vars).forEach(key => evalVars[key] = vars[key].value)

        funcs.forEach(func => {
            if (func.plotVar === 'x')
                return

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

            dataSet.push({
                x: [x],
                y: [y],
                mode: 'markers',
                type: 'scatter',
                marker: { color: func.color, size: 18 },
                name: func.plotVar
            })
        })

        return dataSet
    })

    render() {
        const curves = this.updateCurves(this.props.functions, this.state.xRange)
        const points = this.updatePoints(this.props.functions, this.props.vars)

        return (
            <Plot
                data={ curves.concat(points) }
                layout={{
                    width: this.state.width,
                    height: this.state.height,
                    margin: { l: 20, r: 20, t: 20, b: 20 },
                    dragmode: this.state.dragmode,
                    hovermode: 'closest',
                    xaxis: { range: this.state.xRange },
                    yaxis: { range: this.state.yRange },
                    showlegend: false,
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    modebar: {
                        bgcolor: 'rgba(0,0,0,0)',
                        activecolor: 'rgba(150,150,150,255)',
                        color: 'rgba(0,0,0,255)',
                    }
                }}
                config={{
                    displaylogo: false,
                    modeBarButtonsToRemove: [
                        'toImage',
                        'autoScale2d',
                        'toggleSpikelines',
                        'hoverClosestCartesian',
                        'hoverCompareCartesian'
                    ]
                }}
                onRelayout={this.onRelayout}
            />
        );
    }
}
