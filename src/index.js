import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Util from './util.js';

class Grid extends React.Component {
	constructor(props) {
		super(props)

		this.onMouseMove = this.onMouseMove.bind(this)		
		this.state = {
			width: props.width,
			height: props.height
		}
	}

	onMouseMove(event) {
		let x = Util.clamp(event.nativeEvent.offsetX / this.state.width);
		let y = Util.clamp(event.nativeEvent.offsetY / this.state.height);

		console.log(`${x} ${y}`)
	}

	render() {
		return (
			<canvas
				id="gridCanvas"
				width={ this.props.width }
				height={ this.props.height }
				onMouseMove={ this.onMouseMove }
			/>
		)
	}
}

class ControlPanel extends React.Component {
	render() {
		return (
			<form>

			</form>
		)
	}
}

class UtilSim extends React.Component {
	render() {
		return (
			<div className="utilSim">
				<h4>Aura projection utility function simulator</h4>

				<Grid width="200" height="200" />
				<ControlPanel />
			</div>
		);
	}
}

ReactDOM.render(<UtilSim />, document.getElementById('root'));
