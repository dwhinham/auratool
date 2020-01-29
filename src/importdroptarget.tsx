///<reference path="./types/types.d.ts" />

import React from 'react'

import { useDrop } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import Button from 'react-bootstrap/Button'

const outerStyle: React.CSSProperties = {
	height: '12rem',
	padding: '1rem',
	textAlign: 'center',
	fontSize: '1rem',
	lineHeight: 'normal',
	border: '1px dashed darkgrey',
	borderRadius: '1rem',
	display: 'table',
	width: '100%'
}

const middleStyle: React.CSSProperties = {
	display: 'table-cell',
	verticalAlign: 'middle'
}

const innerStyle: React.CSSProperties = {
	marginLeft: 'auto',
	marginRight: 'auto',
}

interface ImportDropTargetProps {
	onFilesSelected?: FilesSelectedCallback
}

const ImportDropTarget: React.FC<ImportDropTargetProps> = (props) => {
	let fileUploader: HTMLInputElement | null = null

	const [{ canDrop, isOver }, drop] = useDrop({
		accept: [ NativeTypes.FILE ],
		drop: (item, monitor) => {
			const files = monitor.getItem().files
			if (files && props.onFilesSelected)
				props.onFilesSelected(files)
		},
		collect: monitor => ({
			isOver: monitor.isOver(),
			canDrop: monitor.canDrop()
		}),
	})

	let backgroundColor = 'white'

	// Dragged file is over the drop zone
	if (canDrop && isOver) {
		backgroundColor = 'lightgreen'
		return (
			<div ref={drop} style={{ ...outerStyle, backgroundColor }}>
				<div style={ middleStyle }>
					<div style={ innerStyle }>
						Release to drop!
					</div>
				</div>
			</div>
		)
	}

	// Dragged file is in the browser window
	if (canDrop) {
		backgroundColor = 'lightyellow'
		return (
			<div ref={drop} style={{ ...outerStyle, backgroundColor }}>
				<div style={ middleStyle }>
					<div style={ innerStyle }>
						Drag file here...
					</div>
				</div>
			</div>
		)
	}

	// No dragging
	return (
		<div ref={drop} style={{ ...outerStyle, backgroundColor }}>
			<div style={ middleStyle }>
				<div style={ innerStyle }>
					<p>Drag and drop an exported .json file</p>
					<p>or:</p>
					<Button variant="success" onClick={ () => { fileUploader && fileUploader.click() } }>
						Select from your computer
					</Button>

					<input
						type='file'
						id='file'
						ref={ (input) => { fileUploader = input } }
						style={ {display: 'none'} }
						onChange={ (event) => { event.target.files && props.onFilesSelected && props.onFilesSelected(event.target.files) } }
					/>
				</div>
			</div>
		</div>
	)
}

export default ImportDropTarget
