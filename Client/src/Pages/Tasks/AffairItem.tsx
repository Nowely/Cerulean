import {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Affair} from "../../Models/Affair";
import {Status} from "./constants";
import {ListItem, ListItemText, ListItemSecondaryAction, Divider, ButtonGroup, IconButton} from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {AffairDialog} from "./AffairDialog";
import {store} from "../../Stores/Store";

interface AffairItemProps {
	item: Affair,
}

export const AffairItem = observer(({item}: AffairItemProps) => {
	const [dialog, setDialog] = useState(false);
	const [value, setValue] = useState(item);

	const handleChange = (status: Status) => {
		store.affairs.update({...item, active: false, status});
	}

	useEffect(() => setValue(item), [item])

	return <>
		<ListItem disabled={false && value.status !== Status.Absent} button onClick={() => setDialog(true)}>
			<ListItemText
				primary={value.title}
				secondary={value.note}/>
			<ListItemSecondaryAction>
				<ButtonGroup
					size="small"
					disableElevation
					orientation="vertical">
					<IconButton edge="end" onClick={() => handleChange(Status.Completed)}>
						<CheckRoundedIcon color="primary"/>
					</IconButton>
					<IconButton edge="end" onClick={() => handleChange(Status.Failed)}>
						<CloseRoundedIcon color="error"/>
					</IconButton>
				</ButtonGroup>
			</ListItemSecondaryAction>
		</ListItem>
		<Divider variant="middle" component="li"/>
		<AffairDialog
			open={dialog}
			onClose={() => setDialog(false)}
			item={value}
		/>
	</>;
});