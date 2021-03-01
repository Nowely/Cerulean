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

export const TasksColumn = ({type, children}) => {
	const classes = useStyles();
	const [items, setItems] = useState([]);
	const [itemTitle, setItemTitle] = useState("");

	//TODO фильтрация и расположение по типу, но это в родителе
	const handleKeyDown = (event) => {
		if (event.key === 'Enter' && !_.isEmpty(itemTitle)) {
			event.preventDefault();
			setItems([
				...items,
				{
					id: items.length,
					title: itemTitle,
					notes: "",
					checklist: [],
					active: true,
					status: STATUS.Absent,
					difficulty: "",
					type: type, //Column type from title
					color: "", //Green, Red, Common task
					dueDate: null,
					tags: [],
				}
			]);
			setItemTitle("");
			//TODO отправлять на базу изменения
		}
	}

	const changeStatus = (index, newStatus) => {
		items[index].active = false;
		items[index].status = newStatus;
		setItems([...items]);
	}

	const [value, setValue] = useState(0);

	const handleChange = (event, newValue) => {
		setValue(newValue);
	};

	useEffect(() => {
		//TODO получать записи с базы
	}, [])

	return <div style={{width: '25%'}}>
		<div style={{display: 'flex', justifyContent: 'space-between'}}>
			<Typography className={classes.typographyPaper}> {_.findKey(TODO_TYPE, (value) => value === type)}</Typography>
			<Tabs
				TabIndicatorProps={{style: {bottom: 'auto'}}}
				className={classes.filterTabs}
				value={value}
				indicatorColor="primary"
				textColor="primary"
				onChange={handleChange}
				aria-label="disabled tabs example"
			>
				{<Tab className={classes.filterTab} label="Active"/>}
				<Tab className={classes.filterTab} label="Completed"/>
				<Tab className={classes.filterTab} label="Failed"/>
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
				{items.map((value, index) => <ToDoItem key={index} {...value} changeStatus={_.partial(changeStatus, index)}/>)}
			</List>
			abc
			{children}
		</Paper>
	</div>;

};

const ToDoItem = (props) => {
	const classes = useStyles();

	return <>
		<ListItem disabled={props.status !== STATUS.Absent} button>
			<ListItemText
				primary={props.title}
				secondary={props.notes}/>
			<ListItemSecondaryAction>
				<ButtonGroup
					size="small"
					disableElevation
					orientation="vertical">
					<IconButton edge="end" onClick={() => props.changeStatus(STATUS.Completed)}>
						<CheckRoundedIcon color="primary"/>
					</IconButton>
					<IconButton edge="end" onClick={() => props.changeStatus(STATUS.Failed)}>
						<CloseRoundedIcon color="error"/>
					</IconButton>
				</ButtonGroup>
			</ListItemSecondaryAction>
		</ListItem>
		<Divider variant="middle" component="li"/>
	</>;
};