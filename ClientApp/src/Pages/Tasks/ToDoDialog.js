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
	const {onClose, value: valueProp, open, ...other} = props;
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
			onEntering={handleEntering}
			open={open}
			{...other}
		>
			<DialogTitle id="confirmation-dialog-title">Phone Ringtone</DialogTitle>
			<DialogContent dividers>
				<RadioGroup
					ref={radioGroupRef}
					aria-label="ringtone"
					name="ringtone"
					value={value}
					onChange={handleChange}
				>
					{options.map((option) => (
						<FormControlLabel value={option} key={option} control={<Radio/>} label={option}/>
					))}
				</RadioGroup>
			</DialogContent>
			<DialogActions>
				<Button autoFocus onClick={handleCancel} color="primary">
					Cancel
				</Button>
				<Button onClick={handleOk} color="primary">
					Ok
				</Button>
			</DialogActions>
		</Dialog>
	);
}
