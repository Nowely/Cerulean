import {useStyles} from '../../styles'
import {TasksColumn} from './TasksColumn'
import {TODO_TYPE} from "./constants";

export const Tasks = (props) => {
	const classes = useStyles();

	return <>
		<TasksColumn type={TODO_TYPE.Daily}>	</TasksColumn>
		<TasksColumn type={TODO_TYPE.Month}>	</TasksColumn>
		<TasksColumn type={TODO_TYPE.Week}>	</TasksColumn>
		<TasksColumn type={TODO_TYPE.Year}>	</TasksColumn>
	</>
}