import {useStyles} from "../../styles";
import ListItem from "@material-ui/core/ListItem";
import {STATUS} from "./constants";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import IconButton from "@material-ui/core/IconButton";
import CheckRoundedIcon from "@material-ui/icons/CheckRounded";
import CloseRoundedIcon from "@material-ui/icons/CloseRounded";
import Divider from "@material-ui/core/Divider";
import {useEffect, useState} from "react";
import {ToDoDialog} from "./ToDoDialog";
import {Task} from "../../Models/Task";

interface ToDoItemProps {
	item: Task,
	onChange: (task: Task) => void,
	onDelete: (id: string) => void,
}

export const ToDoItem = ({item, onChange, onDelete}: ToDoItemProps) => {
	const classes = useStyles();
	const [dialog, setDialog] = useState(false);
	const [value, setValue] = useState(item);

	const handleChange = (status: STATUS) => {
		let newValue = {...value, status, active: false};
		setValue(newValue);
		onChange(newValue);
	}

	useEffect(() => setValue(item), [item])

	return <>
		<ListItem disabled={false && value.status !== STATUS.Absent} button onClick={() => setDialog(true)}>
			<ListItemText
				primary={value.title}
				secondary={value.note}/>
			<ListItemSecondaryAction>
				<ButtonGroup
					size="small"
					disableElevation
					orientation="vertical">
					<IconButton edge="end" onClick={() => handleChange(STATUS.Completed)}>
						<CheckRoundedIcon color="primary"/>
					</IconButton>
					<IconButton edge="end" onClick={() => handleChange(STATUS.Failed)}>
						<CloseRoundedIcon color="error"/>
					</IconButton>
				</ButtonGroup>
			</ListItemSecondaryAction>
		</ListItem>
		<Divider variant="middle" component="li"/>
		<ToDoDialog
			onDelete={onDelete}
			open={dialog}
			onSave={onChange}
			onClose={() => setDialog(false)}
			value={value}
		/>
	</>;
};