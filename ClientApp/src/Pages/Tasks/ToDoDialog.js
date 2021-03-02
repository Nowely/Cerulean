import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Paper from '@material-ui/core/Paper';
import PropTypes from 'prop-types';
import {makeStyles} from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import RadioGroup from '@material-ui/core/RadioGroup';
import Radio from '@material-ui/core/Radio';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import {useState, useRef, useEffect} from "react";

const options = [
	'None',
	'Atria',
	'Callisto',
	'Dione',
	'Ganymede',
	'Hangouts Call',
	'Luna',
	'Oberon',
	'Phobos',
	'Pyxis',
	'Sedna',
	'Titania',
	'Triton',
	'Umbriel',
];


export const ToDoDialog = (props) => {
	const {onClose, value: valueProp, open} = props;
	const [value, setValue] = useState(valueProp);
	const radioGroupRef = useRef(null);

	useEffect(() => {
		if (!open) {
			setValue(valueProp);
		}
	}, [valueProp, open]);

	const handleEntering = () => {
		if (radioGroupRef.current != null) {
			radioGroupRef.current.focus();
		}
	};

	const handleCancel = () => {
		onClose();
	};

	const handleOk = () => {
		onClose(value);
	};

	const handleChange = (event) => {
		setValue(event.target.value);
	};

	return (
		<Dialog
			disableBackdropClick
			disableEscapeKeyDown
			fullWidth={true}
			maxWidth="sm"
			onEntering={handleEntering}
			open={open}
		>
			<DialogTitle>{value.title}</DialogTitle>

			<DialogContent dividers>

			</DialogContent>

			<DialogActions>
				{/*TODO убрать костыль со стилем*/}
				<Button style={{right: 349}} variant="contained" color="secondary">
					Delete
				</Button>
				<Button autoFocus onClick={handleCancel} color="primary">
					Cancel
				</Button>
				<Button onClick={handleOk}  variant="contained" color="primary">
					Ok
				</Button>
			</DialogActions>
		</Dialog>
	);
}
