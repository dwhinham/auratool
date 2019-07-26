import React, { Component } from 'react'
import Plot from 'react-plotly.js';

import evaluatex from 'evaluatex/dist/evaluatex';

export default class FunctionPlot extends Component {
    getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    render() {
        const step = 0.001

        let dataSet = []
        this.props.functions.forEach((func) => {
            try {
                let data = {
                    x: [],
                    y: [],
                    type: 'scatter',
                    mode: 'lines',
                    marker: { color: this.getRandomColor() },
                }

                const evalFunc = evaluatex(func)
                for (let x = 0; x <= 1.1; x += step) {
                    data.x.push(x)
                    data.y.push(evalFunc({ x, e: Math.E, pi: Math.PI }))
                }
                dataSet.push(data)
            } catch {
                // Skip this function
            }
        })

        if (this.props.functions) {

        }

        return (
            <Plot
                data={dataSet}
                layout={{ width: 500, height: 500, margin: { l: 20, r: 0, t: 0, b: 20 } }}
                config={{ displaylogo: false }}
            />
        );
    }
}
