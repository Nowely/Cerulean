import {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {Affair} from "../../Models/Affair";
import {AffairStore} from "../../Stores/AffairStore";
import {Button, Dialog,	DialogActions,	DialogContent,	DialogTitle, TextField} from '@mui/material';

interface AffairDialogProps {
	item: Affair,
	open: boolean,
	onClose: () => void,
}

export const AffairDialog = observer(({onClose, item, open}: AffairDialogProps) => {
	const [value, setValue] = useState<Affair>(item);

	useEffect(() => {
		if (!open) {
			setValue(item);
		}
	}, [item, open]);

	return <Dialog
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
				AffairStore.instance.delete(value.id);
				onClose();
			}} variant="contained" color="secondary"> Delete </Button>
			<Button autoFocus onClick={() => onClose()} color="primary"> Cancel </Button>
			<Button onClick={() => {
				AffairStore.instance.update(value.id, value)
				onClose();
			}} variant="contained" color="primary"> Save </Button>
		</DialogActions>
	</Dialog>;
})
