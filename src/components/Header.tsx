///<reference path="../types/types.d.ts" />

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import * as React from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import logo from '../assets/logo.svg';
import { faFileImport, faFileExport } from '@fortawesome/free-solid-svg-icons';

interface HeaderProps {
	onImportClickedCallback?: ImportClickedCallback,
	onExportClickedCallback?: ExportClickedCallback
}

export const Header: React.FC<HeaderProps> = (props) => {
	return (
		<Navbar bg="dark" variant="dark" expand="lg">
			<Navbar.Brand href="#home">
				<img
					src={ logo }
					width="200"
					className="d-inline-block align-top"
					alt="auratool"
				/>
			</Navbar.Brand>
			<Navbar.Text>
				<a href={`https://github.com/dwhinham/auratool/commit/${process.env.REACT_APP_GIT_SHA}`}>{process.env.REACT_APP_GIT_VERSION}</a>
			</Navbar.Text>
			<Navbar.Toggle aria-controls="responsive-navbar-nav" />
			<Navbar.Collapse id="responsive-navbar-nav">
				<Nav className="ml-auto">
					<Nav.Link onClick={ () => props.onImportClickedCallback && props.onImportClickedCallback() }>
						<FontAwesomeIcon icon={faFileImport} /> Import
					</Nav.Link>
					<Nav.Link onClick={ () => props.onExportClickedCallback && props.onExportClickedCallback() }>
						<FontAwesomeIcon icon={faFileExport} /> Export
					</Nav.Link>
				</Nav>
			</Navbar.Collapse>
		</Navbar>
	)
}

export default Header
