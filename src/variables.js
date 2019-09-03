import React from 'react'

import MathJax from 'react-mathjax2'
import Table from 'react-bootstrap/Table'

import { round }  from 'lodash'

/*
cost of sending and receiving an object migration
cost of sending and receiving an aura creation
cost of sending and receiving an aura update
cost of sending and receiving an aura deletion
cost of maintaining an aura on the sending and receiving side
and then of course cost of simulating an object, but this is really dependent on what it is doing (sleeping or not, number of contacts, number of nearby objects)
then you can calculate the cost of having a boundary in particular place, depending on all the above factors
there's also the cost of number of objects that are completely out of their host server's region as the islands check has to be performed on them
*/

export const vars = {
    CPU_l: {
        type: "proportion",
        desc: "CPU load of the server.",
    },
    O_a: {
        type: "proportion",
        desc: "Number of active objects.",
    },
    O_b: {
        type: "proportion",
        desc: "Number of objects near a boundary.",
    },
    O_t: {
        type: "count",
        desc: "Total number of objects on the server.",
    },
    T_m: {
        type: "count",
        desc: "Time since boundaries were last moved (seconds)."
    }
}

export default function Variables(props) {
    return (
        <div>
            <Table hover striped size="sm">
                <thead>
                    <tr>
                        <th>Variable</th>
                        <th>Type</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                { Object.keys(vars).map((v, i) =>
                    <tr key={i}>
                        <td><MathJax.Node>{v}</MathJax.Node></td>
                        <td>{vars[v].type}</td>
                        <td>{vars[v].desc}</td>
                    </tr>
                )}
                </tbody>
            </Table>

            <Table hover striped size="sm">
                <thead>
                    <tr>
                        <th>Boundary</th>
                        { Object.keys(vars).map((v, i) => <th key={i}><MathJax.Node>{v}</MathJax.Node></th>) }
                    </tr>
                </thead>
                <tbody>
                { props.boundaries.map((b, i) =>
                    <tr key={i}>
                        <td>{i}</td>
                        { Object.keys(b.vars).map((v, j) =>
                        <td key={j}>{round(b.vars[v], 2)}</td>
                        )}
                    </tr>
                )}
                </tbody>
            </Table>
        </div>
    )
}