import {useStyles} from '../../styles'
import Paper from "@material-ui/core/Paper";
import TextField from '@material-ui/core/TextField';

import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import Divider from '@material-ui/core/Divider';
import ListItemText from '@material-ui/core/ListItemText';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';
import CloseRoundedIcon from '@material-ui/icons/CloseRounded';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import {useEffect, useState} from "react";
import _ from 'lodash'
import {STATUS, TODO_TYPE} from "./constants";
import {v4} from 'uuid';
import axios from 'axios';

export const TasksColumn = ({type, data, children}) => {
	const classes = useStyles();
	const [tasks, setTasks] = useState([]);
	const [itemTitle, setItemTitle] = useState("");

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
			addTask(newTask);
			//TODO отправлять на базу изменения
		}
	}

	useEffect(() => {
		if (!_.isEmpty(data) && _.isArray(data)) {
			setTasks(data);
		}
	}, [data])

	const addTask = async (task) => {
		try {
			const response = await axios.post(`task`, {...task});
			console.log(response);
		} catch (e) {
			console.error(e);
		}
	}

	const updateTask = async (task) => {
		try {
			const response = await axios.put(`task`, task);
			console.log(response);
		} catch (e) {
			console.error(e);
		}
	}

	const deleteTask = async (id) => {
		try {
			const response = await axios.delete(`task`, {params: {id}});
			console.log(response);
		} catch (e) {
			console.error(e);
		}
	}

	const changeStatus = (id, newStatus) => {
		let item = tasks.find(value => value.id === id);
		item.active = false;
		item.status = newStatus;
		setTasks([...tasks]);
		updateTask(item);
	}

	const [filterTab, setFilterTab] = useState(0);

	const handleChange = (event, newValue) => {
		setFilterTab(newValue);
	};

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
				onChange={handleChange}
				aria-label="disabled tabs example"
			>
				{<Tab className={classes.filterTab} label="Active"/>}
				<Tab className={classes.filterTab} value={STATUS.Completed} label="Completed"/>
				<Tab className={classes.filterTab} value={STATUS.Failed} label="Failed"/>
			</Tabs>
		</div>
		{/*TODO Title component? С названием колонки, отключаемым колличеством элементов и фильтрами в правой зоне */}
		<Paper className={classes.paper} elevation={6}>
			<TextField fullWidth
								 label="Add a To Do" variant="outlined" size="small"
								 onKeyPress={handleKeyDown}
								 value={itemTitle}
								 onChange={event => setItemTitle(event.target.value)}/>
			<List>
				{tasks.filter(itemsFilter).map((value, index) => <ToDoItem key={index} {...value}
																																	 changeStatus={changeStatus}/>)}
			</List>
			abc
		</Paper>
	</div>;

};

const ToDoItem = (props) => {
	const classes = useStyles();

	return <>
		<ListItem disabled={props.status !== STATUS.Absent} button>
			<ListItemText
				primary={props.title}
				secondary={props.note}/>
			<ListItemSecondaryAction>
				<ButtonGroup
					size="small"
					disableElevation
					orientation="vertical">
					<IconButton edge="end" onClick={() => props.changeStatus(props.id, STATUS.Completed)}>
						<CheckRoundedIcon color="primary"/>
					</IconButton>
					<IconButton edge="end" onClick={() => props.changeStatus(props.id, STATUS.Failed)}>
						<CloseRoundedIcon color="error"/>
					</IconButton>
				</ButtonGroup>
			</ListItemSecondaryAction>
		</ListItem>
		<Divider variant="middle" component="li"/>
	</>;
};