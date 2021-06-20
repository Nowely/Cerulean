import {useStyles} from '../../styles'
import Paper from "@material-ui/core/Paper";
import TextField from '@material-ui/core/TextField';
import List from '@material-ui/core/List';
import Typography from '@material-ui/core/Typography';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import {ReactNode, useEffect, useState} from "react";
import _ from 'lodash'
import {STATUS, TODO_TYPE} from "./constants";
import {ToDoItem} from "./ToDoItem";
import {Affair} from "../../Models/Affair";

interface AffairsColumnProps {
	type: TODO_TYPE,
	data: Affair[],
	children?: ReactNode,
}

export const AffairsColumn = ({type, data, children}: AffairsColumnProps) => {
	const classes = useStyles();
	const [affairs, setAffairs] = useState<Affair[]>([]);
	const [itemTitle, setItemTitle] = useState("");
	const [filterTab, setFilterTab] = useState(0);

	const handleKeyDown = (event: { key: string; preventDefault: () => void; }) => {
		if (event.key === 'Enter' && !_.isEmpty(itemTitle)) {
			event.preventDefault();
			let newAffair = new Affair();
			//TODO
			newAffair.title = itemTitle;
			newAffair.type = type;

			setAffairs([
				...affairs,
				newAffair
			]);
			setItemTitle("");
			Affair.create(newAffair);
		}
	}

	useEffect(() => {
		if (!_.isEmpty(data) && _.isArray(data)) {
			setAffairs(data);
		}
	}, [data])

	const handleChange = (affair: Affair) => {
		let index = affairs.findIndex(item => item.id === affair.id);
		affairs[index] = affair;
		setAffairs([...affairs]);
		Affair.update(affair);
	}

	const handleDelete = (id: string) => {
		setAffairs(affairs.filter(item => item.id !== id));
		Affair.delete(id);
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
			<Typography className={classes.typographyPaper}> {_.findKey(TODO_TYPE, (value) => value === type)}</Typography>
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
				<Tab className={classes.filterTab} value={STATUS.Completed} label="Completed"/>
				<Tab className={classes.filterTab} value={STATUS.Failed} label="Failed"/>
			</Tabs>
		</div>
		<Paper className={classes.paper} elevation={6}>
			<TextField fullWidth
								 label="Add a To Do" variant="outlined" size="small"
								 onKeyPress={handleKeyDown}
								 value={itemTitle}
								 onChange={event => setItemTitle(event.target.value)}/>
			<List>
				{affairs.filter(itemsFilter).map(item =>
					<ToDoItem key={item.id} item={item} onChange={handleChange} onDelete={handleDelete} />)}
			</List>
			{children}
		</Paper>
	</div>;
};

