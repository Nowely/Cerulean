import {useStyles} from '../../styles'
import {TasksColumn} from './TasksColumn'
import {TODO_TYPE} from "./constants";
import {useEffect, useState} from "react";
import {Task} from "../../Queries";

export const Tasks = (props) => {
	const classes = useStyles();
	const [tasks, setTasks] = useState([]);

	const taskTypeFilter = (type) => {
	  return tasks.filter(task => task?.type === type);
	}

	useEffect(() => {
		Task.get((response) => setTasks(response.data))
	}, []);

	return <>
		<TasksColumn type={TODO_TYPE.Daily} data={taskTypeFilter(TODO_TYPE.Daily)}/>
		<TasksColumn type={TODO_TYPE.Week} data={taskTypeFilter(TODO_TYPE.Week)}/>
		<TasksColumn type={TODO_TYPE.Month} data={taskTypeFilter(TODO_TYPE.Month)}/>
		<TasksColumn type={TODO_TYPE.Year} data={taskTypeFilter(TODO_TYPE.Year)}/>
	</>
}