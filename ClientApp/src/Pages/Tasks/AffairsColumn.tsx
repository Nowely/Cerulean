import {useStyles} from '../../styles'
import {ReactNode, useState} from "react";
import {Paper, TextField, List, Typography, Tabs, Tab} from "@material-ui/core";
import _ from 'lodash'
import {Affair} from "../../Models/Affair";
import {AffairItem} from "./AffairItem";
import {Status, AffairType} from "./constants";
import {AffairStore} from "../../Stores/AffairStore";
import {observer} from "mobx-react";

interface AffairsColumnProps {
	type: AffairType,
	children?: ReactNode,
}

export const AffairsColumn = observer(({type, children}: AffairsColumnProps) => {
	const classes = useStyles();
	const [itemTitle, setItemTitle] = useState("");
	const [filterTab, setFilterTab] = useState(0);
	const data = AffairStore.instance.data;

	const handleKeyDown = (event: { key: string; preventDefault: () => void; }) => {
		if (event.key === 'Enter' && !_.isEmpty(itemTitle)) {
			event.preventDefault();
			//TODO
			let newAffair = new Affair();
			newAffair.title = itemTitle;
			newAffair.type = type;

			setItemTitle("");
			AffairStore.instance.create(newAffair);
		}
	}

	const itemsFilter = ((value: Affair) => {
		switch (filterTab) {
			case 0:
				return value.active;
			default:
				return value.status === filterTab;
		}
	});

	return <div style={{width: '25%'}}>
		<div style={{display: 'flex', justifyContent: 'space-between'}}>
			<Typography
				className={classes.typographyPaper}> {_.findKey(AffairType, (value) => value === type)}</Typography>
			<Tabs
				TabIndicatorProps={{style: {bottom: 'auto'}}}
				className={classes.filterTabs}
				value={filterTab}
				indicatorColor="primary"
				textColor="primary"
				onChange={(_, newValue) => setFilterTab(newValue)}
				aria-label="disabled tabs example"
			>
				{<Tab className={classes.filterTab} label="Active"/>}
				<Tab className={classes.filterTab} value={Status.Completed} label="Completed"/>
				<Tab className={classes.filterTab} value={Status.Failed} label="Failed"/>
			</Tabs>
		</div>
		<Paper className={classes.paper} elevation={6}>
			<TextField fullWidth
					   label="Add a To Do" variant="outlined" size="small"
					   onKeyPress={handleKeyDown}
					   value={itemTitle}
					   onChange={event => setItemTitle(event.target.value)}/>
			<List>
				{data.filter(task => task?.type === type).filter(itemsFilter).map(item =>
					<AffairItem key={item.id} item={item}/>)}
			</List>
			{children}
		</Paper>
	</div>;
});

