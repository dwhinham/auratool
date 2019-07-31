import evaluatex from 'evaluatex/dist/evaluatex';
import Plot from 'react-plotly.js';
import React, { PureComponent } from 'react'

export default class FunctionPlot extends PureComponent {
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
        const step = (this.state.xRange[1] - this.state.xRange[0]) / 1000

        let dataSet = []
        this.props.functions.forEach((func) => {
            try {
                let data = {
                    x: [],
                    y: [],
                    type: 'scatter',
                    mode: 'lines',
                    marker: { color: func.color },
                    name: func.expression
                }

                const evalFunc = evaluatex(func.expression)
                for (let x = this.state.xRange[0]; x <= this.state.xRange[1] + step; x += step) {
                    data.x.push(x)
                    data.y.push(evalFunc({ x, e: Math.E, pi: Math.PI }))
                }
                dataSet.push(data)
            } catch {
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
