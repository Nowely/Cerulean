import {AffairsColumn} from './AffairsColumn'
import {TODO_TYPE} from "./constants";
import {useEffect, useState} from "react";
import {Affair} from "../../Models/Affair";
import {AffairStore} from "../../Stores/AffairStore";

interface TasksProps {
}

export const Tasks = (props: TasksProps) => {
	const [tasks, setTasks] = useState<Affair[]>([]);

	const taskTypeFilter = (type: TODO_TYPE) => {
	  return tasks.filter(task => task?.type === type);
	}

	useEffect(() => {
		AffairStore.instance.get((response) => setTasks(response.data))
	}, []);

	//TODO убрать передачу data
	return <>
		<AffairsColumn type={TODO_TYPE.Daily} data={taskTypeFilter(TODO_TYPE.Daily)}/>
		<AffairsColumn type={TODO_TYPE.Week} data={taskTypeFilter(TODO_TYPE.Week)}/>
		<AffairsColumn type={TODO_TYPE.Month} data={taskTypeFilter(TODO_TYPE.Month)}/>
		<AffairsColumn type={TODO_TYPE.Year} data={taskTypeFilter(TODO_TYPE.Year)}/>
	</>
}