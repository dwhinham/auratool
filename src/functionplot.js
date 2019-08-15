import Plot from 'react-plotly.js';
import React, { Component } from 'react'

export default class FunctionPlot extends Component {
    constructor(props) {
        super(props)
        this.state = {
            xRange: [0, 1],
            yRange: [0, 1],
            dragmode: 'pan'
        }
    }

    onRelayout = (layout) => {
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

    render() {
        const step = (this.state.xRange[1] - this.state.xRange[0]) / 10

        // Coerce the variables array into the right format for evaluatex
        var vars = {}
        Object.keys(this.props.vars).forEach(key => vars[key] = this.props.vars[key].value)

        var dataSet = []
        this.props.functions.forEach(func => {
            if (!func.evalFunc)
                return

            try {
                var data = {
                    x: [],
                    y: [],
                    type: 'scatter',
                    mode: 'lines',
                    marker: { color: func.color },
                    name: func.expression
                }

                for (var x = this.state.xRange[0]; x <= this.state.xRange[1] + step; x += step) {
                    var result = func.evalFunc({
                        [func.plotVar]: x,

                        // Constants
                        e: Math.E,
                        pi: Math.PI,

                        // Variable values
                        ...vars
                    })

                    data.x.push(x)
                    data.y.push(result)
                }
                dataSet.push(data)
            } catch(e) {
                // Skip this function
            }
        })

        return (
            <Plot
                data={dataSet}
                layout={{
                    width: this.props.width,
                    height: this.props.height,
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
                onRe
            />
        );
    }
}
