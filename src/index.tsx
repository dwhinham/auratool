import React from 'react'
import ReactDOM from 'react-dom';

import MathJax from 'react-mathjax2';

import 'bootstrap/dist/css/bootstrap.css';
import './index.css';

import App from './App'
import * as serviceWorker from './serviceWorker';

// Setup Font Awesome
import { library } from '@fortawesome/fontawesome-svg-core'
import {
	faBorderAll, faBowlingBall, faChartLine, faCube, faDice,
	faEye, faHome, faMagnet, faPlus, faPalette, faRadiation,
	faTh, faThLarge, faTrash, faVectorSquare
} from '@fortawesome/free-solid-svg-icons'
library.add(
	faBorderAll, faBowlingBall, faChartLine, faCube, faDice,
	faEye, faHome, faMagnet, faPlus, faPalette, faRadiation,
	faTh, faThLarge, faTrash, faVectorSquare
)

const MATHJAX_OPTIONS = {
	asciimath2jax: {
		useMathMLspacing: true,
		preview: "none",
	}
}

ReactDOM.render(
	<MathJax.Context input="ascii" options={ MATHJAX_OPTIONS }>
		<App />
	</MathJax.Context>,
	document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
