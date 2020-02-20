import styled from 'styled-components'


export const FillParentFlexItem = styled.div`
	flex: 1;
	height: 100%;
	width: 100%;
	min-width: 0;
	min-height: 0;
`

export const ColumnFlexContainer = styled(FillParentFlexItem)`
	display: flex;
	flex-direction: column;
`

export const RowFlexContainer = styled(FillParentFlexItem)`
	display: flex;
	flex-direction: row;
`

export const ControlsContainer = styled.div`
	padding: 0.25rem;
	position: absolute;
`
