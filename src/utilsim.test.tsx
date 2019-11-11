import React from 'react';
import ReactDOM from 'react-dom';
import UtilSim from './utilsim';

it('renders without crashing', () => {
	const div = document.createElement('div');
	ReactDOM.render(<UtilSim />, div);
	ReactDOM.unmountComponentAtNode(div);
});
