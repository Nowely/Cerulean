import {useStyles} from '../../styles'
import {TasksColumn} from './TasksColumn'
import {TODO_TYPE} from "./constants";
import {useEffect, useState} from "react";
import axios from "axios";

export const Tasks = (props) => {
	const classes = useStyles();
	const [tasks, setTasks] = useState([]);

	useEffect(() => {
		//TODO получать записи с базы
	}, [])

	const taskTypeFilter = (type) => {
	  return tasks.filter(task => task?.type === type);
	}

	useEffect(() => {
		getTasks()
	}, [])

	const getTasks = async () => {
		try {
			const response = await axios.get(`task`);
			setTasks(response.data);
		} catch (e) {
			console.error(e);
		}
	}

	return <>
		<TasksColumn type={TODO_TYPE.Daily} data={taskTypeFilter(TODO_TYPE.Daily)}/>
		<TasksColumn type={TODO_TYPE.Week} data={taskTypeFilter(TODO_TYPE.Week)}/>
		<TasksColumn type={TODO_TYPE.Month} data={taskTypeFilter(TODO_TYPE.Month)}/>
		<TasksColumn type={TODO_TYPE.Year} data={taskTypeFilter(TODO_TYPE.Year)}/>
	</>
}