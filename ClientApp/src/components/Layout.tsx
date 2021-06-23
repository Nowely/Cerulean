import React, {ChangeEvent, MouseEvent, ReactChild, useState} from "react";
import {AppBar, Tabs, Tab, Toolbar, Container, IconButton, Typography} from '@material-ui/core';
import WhatshotRoundedIcon from '@material-ui/icons/WhatshotRounded';
import {useStyles} from '../styles'
import {Route, Link} from "react-router-dom";
import PersonRoundedIcon from '@material-ui/icons/PersonRounded';
import MenuItem from '@material-ui/core/MenuItem';
import Menu from '@material-ui/core/Menu';

interface LayoutProps {
	children: ReactChild[],
}

export const Layout = ({children}: LayoutProps) => {
	const classes = useStyles();

	const [value, setValue] = useState(0);
	const [anchorEl, setAnchorEl] = useState<Element | null>(null);
	const open = Boolean(anchorEl);


	const handleChange = (event: ChangeEvent<{}>, newValue: any) => {
		console.log(newValue);
		setValue(newValue);
	};

	const handleMenu = (event: MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget);
	};

	const handleClose = () => {
		setAnchorEl(null);
	};

	//TODO не выделяется корректно таб при перезагрузке страницы и не на первом табе
	//TODO display label without CAPS
	return (
		<div className={classes.root}>
			<AppBar position="static">
				<Toolbar variant="dense">
					<IconButton edge="start" color="inherit" aria-label="menu">
						<WhatshotRoundedIcon/>
					</IconButton>
					<Typography className={classes.title} variant="h6" noWrap>
						Cerulean
					</Typography>
					<Route
						path="/"
						render={({location}) => (
							<>
								<Tabs value={value} onChange={handleChange}>
									<Tab label="Tasks" component={Link} to="/" {...a11yProps(0)}/>
									<Tab label="Counter" component={Link} to="/counter" {...a11yProps(1)}/>
								</Tabs>
							</>
						)}/>

					<IconButton
						style={{right: 0, position: 'absolute'}}
						aria-label="account of current user"
						aria-controls="menu-appbar"
						aria-haspopup="true"
						onClick={handleMenu}
						color="inherit"
					>
						<PersonRoundedIcon />
					</IconButton>
					<Menu
						id="menu-appbar"
						anchorEl={anchorEl}
						anchorOrigin={{
							vertical: 'top',
							horizontal: 'right',
						}}
						keepMounted
						transformOrigin={{
							vertical: 'top',
							horizontal: 'right',
						}}
						open={open}
						onClose={handleClose}
					>
						<MenuItem onClick={handleClose}>Profile</MenuItem>
						<MenuItem onClick={handleClose}>My account</MenuItem>
					</Menu>
				</Toolbar>
			</AppBar>
			<Container maxWidth={false} disableGutters={true} className={classes.container}>
				{children}
			</Container>
		</div>
	);
};

Layout.displayName = Layout.name

//TODO
function a11yProps(index: number) {
	return {
		id: `nav-tab-${index}`,
		'aria-controls': `nav-tabpanel-${index}`,
	};
}
