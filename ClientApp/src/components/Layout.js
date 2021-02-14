import React from 'react';
import {AppBar, Tabs, Tab, Toolbar, Container, IconButton, Typography} from '@material-ui/core';
//import {WhatshotRoundedIcon} from '@material-ui/icons';
import WhatshotRoundedIcon from '@material-ui/icons/WhatshotRounded';
import {useStyles} from '../styles'
import {Switch, Route, Link, BrowserRouter} from "react-router-dom";

export const Layout = props => {
	const classes = useStyles();

	const [value, setValue] = React.useState(0);

	const handleChange = (event, newValue) => {
		console.log(newValue);
		setValue(newValue);
	};

	return (
		<div>
			<AppBar position="static">
				<Toolbar variant="dense">
					<IconButton edge="start" color="inherit" aria-label="menu">
						<WhatshotRoundedIcon/>
					</IconButton>
					<Typography className={classes.title} variant="h6" noWrap>
						Cerulean
					</Typography>
					{/*<Tabs value={value} onChange={handleChange} aria-label="simple tabs example">
					<LinkTab label="Задачи" href="/" {...a11yProps(0)} />
					<LinkTab label="Counter" href="/counter" {...a11yProps(1)} />
					<LinkTab label="Fetch data" href="/fetch-data" {...a11yProps(2)} />
					</Tabs>*/}
					<Route
						path="/"
						render={({location}) => (
							<>
								<Tabs value={value} onChange={handleChange}>
									<Tab label="Задачи" component={Link} to="/" {...a11yProps(0)}/>
									<Tab label="Счетчик" component={Link} to="/counter" {...a11yProps(1)}/>
									{/*<Tab label="Item Three" href="#basic-tabs" component={Link} to="/tab3"/>*/}
								</Tabs>
								{/*<Switch>
									<Route path="/tab2" render={() => <div>Tab 2</div>} />
									<Route path="/tab3" render={() => <div>Tab 3</div>} />
									<Route path="/" render={() => <div>Tab 1</div>} />
								</Switch>*/}
							</>
						)}
					/>
				</Toolbar>
			</AppBar>
			<Container>
				{props.children}
			</Container>
		</div>
	);
};

Layout.displayName = Layout.name

function a11yProps(index) {
	return {
		id: `nav-tab-${index}`,
		'aria-controls': `nav-tabpanel-${index}`,
	};
}
