import React, {MouseEvent, ReactElement, useMemo, useState} from "react";
import {AppBar, Tabs, Tab, Toolbar, Container, IconButton, Typography} from '@material-ui/core';
import WhatshotRoundedIcon from '@material-ui/icons/WhatshotRounded';
import {useStyles} from '../styles'
import {Route, Link} from "react-router-dom";
import PersonRoundedIcon from '@material-ui/icons/PersonRounded';
import MenuItem from '@material-ui/core/MenuItem';
import Menu from '@material-ui/core/Menu';

interface LayoutProps {
	children: ReactElement[],
}

export const Layout = ({children}: LayoutProps) => {
	const classes = useStyles();

	const [anchorEl, setAnchorEl] = useState<Element | null>(null);
	const open = Boolean(anchorEl);

	const tabs = useMemo(() => children.map(child =>
			<Tab key={child.key} label={child.key} to={child.props.path} value={child.props.path} component={Link}/>),
		[children]);

	const handleMenu = (event: MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget);

	};
	const handleClose = () => {
		setAnchorEl(null);
	};

	//TODO display label without CAPS
	return (
		<div className={classes.root}>
			<AppBar position="static" >
				<Toolbar variant="dense">
					<IconButton edge="start" color="inherit" aria-label="menu" children={<WhatshotRoundedIcon/>}/>
					<Typography className={classes.title} variant="h6" noWrap children="Cerulean"/>
					<Route path="/" render={({location}) => <Tabs value={location.pathname}> {tabs} </Tabs>}/>
					<IconButton
						style={{right: 0, position: 'absolute'}}
						onClick={handleMenu}
						color="inherit"
						children={<PersonRoundedIcon/>}
					/>
					<Menu
						id="menu-appbar"
						anchorEl={anchorEl}
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