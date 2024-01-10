import {ReactNode, useState} from "react";
import {styled} from '@mui/material/styles';
import {Paper, TextField, List, Typography, Tabs, Tab} from "@mui/material";
import _ from 'lodash'
import {Affair} from "../../Models/Affair";
import {AffairItem} from "./AffairItem";
import {Status, AffairType} from "./constants";
import {AffairStore} from "../../Stores/AffairStore";
import {observer} from "mobx-react";
import {store} from "../../Stores/Store";

const PREFIX = 'AffairsColumn';

const classes = {
    paper: `${PREFIX}-paper`,
    typographyPaper: `${PREFIX}-typographyPaper`,
    filterTabs: `${PREFIX}-filterTabs`,
    filterTab: `${PREFIX}-filterTab`,
};

const Root = styled('div')(({theme}) => ({

    [`& .${classes.paper}`]: {
        padding: theme.spacing(1),
        textAlign: 'center',
        flex: '1 0 auto',
        margin: theme.spacing(2),
        marginTop: 0,
    },

    [`& .${classes.typographyPaper}`]: {
        marginTop: theme.spacing(1),
        marginLeft: theme.spacing(2),
    },

    [`& .${classes.filterTabs}`]: {
        marginRight: theme.spacing(2),
    },

    [`& .${classes.filterTab}`]: {
        minWidth: 72,
        minHeight: 35,
        marginRight: 0
    },
}));

interface AffairsColumnProps {
    type: AffairType,
    children?: ReactNode,
}

export const AffairsColumn = observer(({type, children}: AffairsColumnProps) => {

    const [itemTitle, setItemTitle] = useState("");
    const [filterTab, setFilterTab] = useState(0);
    const data = [] //TODO store.affairs.data;

    const handleKeyDown = (event: { key: string; preventDefault: () => void; }) => {
        if (event.key === 'Enter' && !_.isEmpty(itemTitle)) {
            event.preventDefault();
            //TODO
            let newAffair = new Affair();
            newAffair.title = itemTitle;
            newAffair.type = type;

            setItemTitle("");
            store.affairs.create(newAffair);
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

    return (
        <Root style={{width: '25%'}}>
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
                    {data
                        ?.filter(task => task?.type === type)
                        ?.filter(itemsFilter).map(item => <AffairItem key={item.id} item={item}/>)}
                </List>
                {children}
            </Paper>
        </Root>
    );
});

