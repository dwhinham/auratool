import React from 'react'
import ReactDOM from 'react-dom';

import 'bootstrap/dist/css/bootstrap.css';
import './index.css';

import UtilSim from './utilsim'

// Setup Font Awesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { faCheckSquare, faPlus, faPalette, faTrash } from '@fortawesome/free-solid-svg-icons'
library.add(faCheckSquare, faPlus, faPalette, faTrash)

// Setup Why Did You Render?
if (process.env.NODE_ENV !== 'production') {
	const whyDidYouRender = require('@welldone-software/why-did-you-render/dist/no-classes-transpile/umd/whyDidYouRender.min.js');
	whyDidYouRender(React);
}

ReactDOM.render(<UtilSim width="500" height="500" />, document.getElementById('root'));
