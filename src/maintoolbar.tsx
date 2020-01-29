///<reference path="./types/types.d.ts" />

import * as React from 'react';
import { Navbar, Nav } from 'react-bootstrap';

interface MainToolbarProps {
	onImportClickedCallback?: ImportClickedCallback,
	onExportClickedCallback?: ExportClickedCallback
}

export const MainToolbar: React.FC<MainToolbarProps> = (props) => {
	return <Navbar bg="dark" variant="dark" expand="lg">
		<Navbar.Brand href="#home">Aura Projection - Utility Function Simulator</Navbar.Brand>
		<Navbar.Toggle aria-controls="responsive-navbar-nav" />
		<Navbar.Collapse id="responsive-navbar-nav">
			<Nav className="ml-auto">
				<Nav.Link onClick={ () => props.onImportClickedCallback && props.onImportClickedCallback() }>Import</Nav.Link>
				<Nav.Link onClick={ () => props.onExportClickedCallback && props.onExportClickedCallback() }>Export</Nav.Link>
			</Nav>
		</Navbar.Collapse>
	</Navbar>
}

export default MainToolbar