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
import {useState} from "react";
import {ToDoDialog} from "./ToDoDialog";

export const ToDoItem = (props) => {
	const classes = useStyles();
	const [dialog, setDialog] = useState(false);

	return <>
		<ListItem disabled={props.status !== STATUS.Absent} button onClick={() => setDialog(true)}>
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
		<ToDoDialog
			open={dialog}
			onClose={() => setDialog(false)}
			value={props}
		/>
	</>;
};