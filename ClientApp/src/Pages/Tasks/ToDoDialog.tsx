import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import {useState, useEffect} from "react";
import {TextField} from "@material-ui/core";
import {Affair} from "../../Models/Affair";

interface ToDoDialogProps {
	value: Affair,
	open: boolean,
	onClose: () => void,
	onDelete: (id: string) => void,
	onSave: (affair: Affair) => void,
}

export const ToDoDialog = ({onClose, value: valueProp, open, onDelete, onSave}: ToDoDialogProps) => {
	const [value, setValue] = useState(valueProp);
	useEffect(() => {
		if (!open) {
			setValue(valueProp);
		}
	}, [valueProp, open]);

	return <Dialog
		disableBackdropClick
		disableEscapeKeyDown
		fullWidth={true}
		maxWidth="sm"
		open={open}
	>
		<DialogTitle>{value.title}</DialogTitle>

		<DialogContent dividers>
			<TextField
				label="Note"
				multiline
				fullWidth
				rows={4}
				value={value.note}
				onChange={(event => setValue({...value, note: event.target.value}))}
				variant="outlined"
			/>
		</DialogContent>

		<DialogActions>
			{/*TODO убрать костыль со стилем*/}
			<Button style={{right: 349}} onClick={() => {
				onDelete(value.id);
				onClose();
			}} variant="contained" color="secondary"> Delete </Button>
			<Button autoFocus onClick={() => onClose()} color="primary"> Cancel </Button>
			<Button onClick={() => {
				onSave(value);
				onClose();
			}} variant="contained" color="primary"> Ok </Button>
		</DialogActions>
	</Dialog>;
}
