import {useStyles} from '../../styles'
import Paper from "@material-ui/core/Paper";
import TextField from '@material-ui/core/TextField';

import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import Divider from '@material-ui/core/Divider';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Avatar from '@material-ui/core/Avatar';
import Typography from '@material-ui/core/Typography';
import Checkbox from '@material-ui/core/Checkbox';
import IconButton from '@material-ui/core/IconButton';


export const TasksColumn = ({children}) => {
	const classes = useStyles();

	return <div style={{width: '25%'}}>
		{/*TODO Title component? С названием колонки, отключаемым колличеством элементов и фильтрами в правой зоне */}
		<Paper className={classes.paper} elevation={6}>
			{/*TODO Быстрый элемент добавления*/}
			<TextField fullWidth label="Add a To Do" variant="filled" size="small"/>
			<List>
				<ToDoItem/>
				<ToDoItem/>
			</List>
			{/*TODO Элементы children полагаю */}
			abc
			{children}
		</Paper>
	</div>;

};

const ToDoItem = (props) => {
	const classes = useStyles();

	return (
		<ListItem alignItems="flex-start">
			<ListItemIcon>
				<Checkbox
					edge="start"
					tabIndex={-1}
					disableRipple/>
			</ListItemIcon>

			<ListItemText
				primary="Brunch this weekend?"
				secondary={
					<>
						<Typography
							component="span"
							variant="body2"
							className={classes.inline}
							color="textPrimary"
						>
							Ali Connors
						</Typography>
						{" — I'll be in your neighborhood doing errands this…"}
					</>
				}
			/>
		</ListItem>
	);
};