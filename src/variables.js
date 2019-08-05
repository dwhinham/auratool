import React, { Component } from 'react'

import MathJax from 'react-mathjax2';

import Table from 'react-bootstrap/Table';

export default class Variables extends Component {
    render() {
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
                { Object.keys(this.props.vars).map((v, i) => { return (
                    <tr key={i}>
                        <td><MathJax.Node>{v}</MathJax.Node></td>
                        <td>{this.props.vars[v].value}</td>
                        <td>{this.props.vars[v].type}</td>
                        <td>{this.props.vars[v].desc}</td>
                    </tr>
                )})}
                </tbody>
            </Table>
        )
    }
}
