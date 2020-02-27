///<reference path="../types/types.d.ts" />

import Backend from 'react-dnd-html5-backend'
import { DndProvider } from 'react-dnd'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileImport } from '@fortawesome/free-solid-svg-icons'
import * as React from 'react'

import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'

import ImportDropTarget from './ImportDropTarget'

interface ImportModalProps {
	show: boolean,
	onClosed?: ModalClosedCallback,
	onHide?: ModalHideCallback,
	onFilesSelected?: FilesSelectedCallback,
}

const ImportModal: React.FC<ImportModalProps> = (props) => {
	return (
		<Modal show={ props.show } onHide={ () => { props.onHide && props.onHide() } }>
			<Modal.Header closeButton>
				<Modal.Title>Import data</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<DndProvider backend={Backend}>
					<ImportDropTarget onFilesSelected={ (files) => { props.onFilesSelected && props.onFilesSelected(files) } } />
				</DndProvider>
			</Modal.Body>
			<Modal.Footer>
				<Button variant="primary" onClick={ () => { props.onClosed && props.onClosed() } }>
					<FontAwesomeIcon icon={ faFileImport } /> Import
				</Button>
			</Modal.Footer>
		</Modal>
	)
}

export default ImportModal
