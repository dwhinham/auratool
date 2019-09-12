///<reference path="./types/types.d.ts" />

import * as React from 'react'
import { Scatter } from 'react-chartjs-2'
import * as chartjs from 'chart.js'
import memoize from 'memoize-one'

import { evaluateUtilFunction } from './util'

interface FunctionPlotProps {
    width: number,
    height: number,
    boundaries: Array<Boundary>,
    utilFunctions: Array<UtilityFunction>,
    utilConstants: UtilityConstants,
    utilGlobalVars: UtilityVariables
}

interface FunctionPlotState {
    width: number,
    height: number,
    xRange: Array<number>,
    yRange: Array<number>
}

export default class FunctionPlot extends React.Component<FunctionPlotProps, FunctionPlotState> {
    constructor(props: FunctionPlotProps) {
        super(props)

        this.state = {
            width: props.width,
            height: props.height,
            xRange: [0, 1],
            yRange: [0, 1],
        }
    }

    // Memoized function returns cached results when arguments are the same as the last call
    private updateCurves = memoize((funcs: Array<UtilityFunction>, constants, globalVars) => {
        const numSteps = 100
        const stepSize = (this.state.xRange[1] - this.state.xRange[0]) / numSteps

        // Plot curves
        let datasets = new Array<chartjs.ChartDataSets>()
        funcs.forEach(func => {
            if (!func.evalFunc)
                return

            let dataset: chartjs.ChartDataSets = {
                label: `U(${func.utilVar})`,
                fill: false,
                showLine: true,
                pointRadius: 0,
                pointHitRadius: 2,
                backgroundColor: func.color,
                borderColor: func.color,
                borderWidth: 2
            }

            dataset.data = new Array<chartjs.ChartPoint>(numSteps)

            try {
                for (let x: number = this.state.xRange[0]; x <= this.state.xRange[1]; x += stepSize) {
                    const y: number = func.evalFunc({
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

    private updatePoints = memoize((
        boundaries: Array<Boundary>,
        funcs: Array<UtilityFunction>,
        constants: UtilityConstants,
        globalVars: UtilityVariables) => {
            let datasets = new Array<chartjs.ChartDataSets>()

            funcs.forEach(func => {
                if (!func.evalFunc || func.utilVar === 'x')
                    return

                try {
                boundaries.forEach((b, i) => {
                    const x = b.vars[func.utilVar]
                    const y = evaluateUtilFunction(func, b, constants, globalVars)

                    datasets.push({
                        label: `B${i} U(${func.utilVar})`,
                        fill: true,
                        showLine: false,
                        pointRadius: 6,
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
                options={{
                    maintainAspectRatio: false,
                    animation: {
                        duration: 0
                    }
                }}
            />
        );
    }
}
