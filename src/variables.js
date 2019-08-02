import React, { Component } from 'react'


import MathJax from 'react-mathjax2';

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

const vars = [
    {
        name: "O_t",
        type: "count",
        desc: "Total number of objects on the server.",
    },
    {
        name: "O_a",
        type: "proportion",
        desc: "Number of active objects.",
    },
    {
        name: "O_b",
        type: "proportion",
        desc: "Number of objects near a boundary.",
    },
    {
        name: "C_l",
        type: "proportion",
        desc: "CPU load of the server.",
    },
]

export default class Variables extends Component {
    render() {
        return (
            <Row>
            { vars.map((v, i) => {
                return (
                    <Row key={i}>
                        <Col>
                            <MathJax.Node inline>{ v.name }</MathJax.Node>
                        </Col>
                    </Row>
                )
            })}
            </Row>
        )
    }
}
