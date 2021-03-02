import {useStyles} from '../../styles'
import Paper from "@material-ui/core/Paper";
import TextField from '@material-ui/core/TextField';
import List from '@material-ui/core/List';
import Typography from '@material-ui/core/Typography';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import {useEffect, useState} from "react";
import _ from 'lodash'
import {STATUS, TODO_TYPE} from "./constants";
import {v4} from 'uuid';
import {ToDoItem} from "./ToDoItem";
import {Task} from "../../Queries";

export const TasksColumn = ({type, data, children}) => {
	const classes = useStyles();
	const [tasks, setTasks] = useState([]);
	const [itemTitle, setItemTitle] = useState("");
	const [filterTab, setFilterTab] = useState(0);

	const handleKeyDown = (event) => {
		if (event.key === 'Enter' && !_.isEmpty(itemTitle)) {
			event.preventDefault();
			let newTask = {
				id: v4(),
				title: itemTitle,
				note: "",
				checklist: [],
				active: true,
				status: STATUS.Absent,
				difficulty: "",
				type: type, //Column type from title
				color: "", //Green, Red, Common task
				dueDate: null,
				tags: [],
			};
			setTasks([
				...tasks,
				newTask
			]);
			setItemTitle("");
			Task.create(newTask);
		}
	}

	useEffect(() => {
		if (!_.isEmpty(data) && _.isArray(data)) {
			setTasks(data);
		}
	}, [data])

	const handleChange = (task) => {
		let index = tasks.findIndex(item => item.id === task.id);
		tasks[index] = task;
		setTasks([...tasks]);
		Task.update(task);
	}

	const handleDelete = (id) => {
		setTasks(tasks.filter(item => item.id !== id));
		Task.delete(id);
	}

	const itemsFilter = (value => {
		switch (filterTab) {
			case 0:
				return value.active;
			default:
				return value.status === filterTab;
		}
	});

	return <div style={{width: '25%'}}>
		<div style={{display: 'flex', justifyContent: 'space-between'}}>
			<Typography className={classes.typographyPaper}> {_.findKey(TODO_TYPE, (value) => value === type)}</Typography>
			<Tabs
				TabIndicatorProps={{style: {bottom: 'auto'}}}
				className={classes.filterTabs}
				value={filterTab}
				indicatorColor="primary"
				textColor="primary"
				onChange={(_, newValue) => setFilterTab(newValue)}
				aria-label="disabled tabs example"
			>
				{<Tab className={classes.filterTab} label="Active"/>}
				<Tab className={classes.filterTab} value={STATUS.Completed} label="Completed"/>
				<Tab className={classes.filterTab} value={STATUS.Failed} label="Failed"/>
			</Tabs>
		</div>
		<Paper className={classes.paper} elevation={6}>
			<TextField fullWidth
								 label="Add a To Do" variant="outlined" size="small"
								 onKeyPress={handleKeyDown}
								 value={itemTitle}
								 onChange={event => setItemTitle(event.target.value)}/>
			<List>
				{tasks.filter(itemsFilter).map(item =>
					<ToDoItem key={item.id} item={item} onChange={handleChange} onDelete={handleDelete} />)}
			</List>
			{children}
		</Paper>
	</div>;
};

