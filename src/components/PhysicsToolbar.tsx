import React from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import Button from 'react-bootstrap/Button'
import ButtonToolbar from 'react-bootstrap/ButtonToolbar'
import ButtonGroup from 'react-bootstrap/ButtonGroup'

import { MouseMode } from './PhysicsSim'

interface PhysicsToolbarProps {
	mouseMode: MouseMode,
	snapToGrid: boolean,

	onMouseModeChanged: MouseModeChangedCallback,

	onHomeClicked: HomeClickedCallback,
	onShowAllObjectsClicked: ShowAllObjectsClickedCallback,
	onRandomClicked: RandomClickedCallback,
	onClearClicked: ClearClickedCallback,

	onSnapToGridChanged: SnapToGridChangedCallback,
	onIncreaseGridSizeClicked: IncreadGridSizeClickedCallback,
	onDecreaseGridSizeClicked: IncreadGridSizeClickedCallback
}

function PhysicsToolbar(props: PhysicsToolbarProps) {
	return (
		<ButtonToolbar>
			<ButtonGroup className="mr-2">
				<Button size="sm" variant="secondary" title="Object mode" active={props.mouseMode === MouseMode.OBJECT} onClick={() => { props.onMouseModeChanged(MouseMode.OBJECT) }}>
					<FontAwesomeIcon icon="cube"></FontAwesomeIcon>
				</Button>
				<Button size="sm" variant="secondary" title="Boundary mode" active={props.mouseMode === MouseMode.BOUNDARY_EDIT} onClick={() => { props.onMouseModeChanged(MouseMode.BOUNDARY_EDIT) }}>
					<FontAwesomeIcon icon="vector-square"></FontAwesomeIcon>
				</Button>
				<Button size="sm" variant="secondary" title="Snooker mode" active={props.mouseMode === MouseMode.SNOOKER} onClick={() => { props.onMouseModeChanged(MouseMode.SNOOKER)  }}>
					<FontAwesomeIcon icon="bowling-ball"></FontAwesomeIcon>
				</Button>
			</ButtonGroup>
			<ButtonGroup className="mr-2">
				<Button size="sm" variant="secondary" title="Reset view" onClick={props.onHomeClicked}><FontAwesomeIcon icon="home"></FontAwesomeIcon></Button>
				<Button size="sm" variant="secondary" title="Show all objects" onClick={props.onShowAllObjectsClicked}><FontAwesomeIcon icon="eye"></FontAwesomeIcon></Button>
			</ButtonGroup>
			<ButtonGroup className="mr-2">
				<Button size="sm" variant="secondary" title="Toggle snap to grid" active={props.snapToGrid} onClick={() => { props.onSnapToGridChanged(!props.snapToGrid) }}>
					<FontAwesomeIcon icon="magnet"></FontAwesomeIcon>
				</Button>
				<Button size="sm" variant="secondary" title="Decrease grid size" onClick={ props.onDecreaseGridSizeClicked }>
					<FontAwesomeIcon icon="th"></FontAwesomeIcon>
				</Button>
				<Button size="sm" variant="secondary" title="Increase grid size" onClick={ props.onIncreaseGridSizeClicked }>
					<FontAwesomeIcon icon="th-large"></FontAwesomeIcon>
				</Button>
			</ButtonGroup>
			<ButtonGroup className="mr-2">
				<Button size="sm" variant="secondary" title="Spawn random objects" onClick={props.onRandomClicked}><FontAwesomeIcon icon="dice"></FontAwesomeIcon></Button>
				<Button size="sm" variant="warning" title="Remove all objects" onClick={props.onClearClicked}><FontAwesomeIcon icon="radiation"></FontAwesomeIcon></Button>
			</ButtonGroup>
		</ButtonToolbar>
	)
}

export default PhysicsToolbar
