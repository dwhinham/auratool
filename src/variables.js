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
    O_t: {
        value: 0,
        type: "count",
        desc: "Total number of objects on the server.",
    },
    O_a: {
        value: 0,
        type: "proportion",
        desc: "Number of active objects.",
    },
    O_b: {
        value: 0,
        type: "proportion",
        desc: "Number of objects near a boundary.",
    },
    CPU_l: {
        value: 0,
        type: "proportion",
        desc: "CPU load of the server.",
    },
}

export default function Variables(props) {
    return (
        <Table hover striped size="sm">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Value</th>
                    <th>Type</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
            { Object.keys(props.vars).map((v, i) => { return (
                <tr key={i}>
                    <td><MathJax.Node>{v}</MathJax.Node></td>
                    <td>{round(props.vars[v].value, 2)}</td>
                    <td>{props.vars[v].type}</td>
                    <td>{props.vars[v].desc}</td>
                </tr>
            )})}
            </tbody>
        </Table>
    )
}