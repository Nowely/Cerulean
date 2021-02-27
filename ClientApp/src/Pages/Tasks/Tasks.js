import {useStyles} from '../../styles'
import {TasksColumn} from './TasksColumn'

export const Tasks = (props) => {
	const classes = useStyles();

	return <>
		<TasksColumn>	</TasksColumn>
		<TasksColumn>	</TasksColumn>
		<TasksColumn>	</TasksColumn>
		<TasksColumn>	</TasksColumn>
	</>
}