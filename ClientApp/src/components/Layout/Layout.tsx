import React, {ReactElement, useMemo} from "react";
import {AppBar, Tabs, Tab, Toolbar, Container, IconButton, Typography} from '@material-ui/core';
import WhatshotRoundedIcon from '@material-ui/icons/WhatshotRounded';
import {useStyles} from '../../styles'
import {Route, Link} from "react-router-dom";
import {UserMenu} from "./UserMenu";

interface LayoutProps {
	children: ReactElement[],
}

export const Layout = ({children}: LayoutProps) => {
	const classes = useStyles();

	const Logo = () => <>
		<IconButton edge="start" color="inherit" aria-label="menu" children={<WhatshotRoundedIcon/>}/>
		<Typography className={classes.title} variant="h6" noWrap children="Cerulean"/>
	</>

	const LinkTab = useMemo(() => children.map(child =>
			<Tab className={classes.routeTab} key={child.key} label={child.key} to={child.props.path} value={child.props.path} component={Link}/>),
		[children]);
	const RouteTabs = () =>
		<Route path="/" render={({location}) => <Tabs value={location.pathname}> {LinkTab} </Tabs>}/>;

	//TODO more Pretty
	//TODO route to single component
	//TODO single styled
	return (
		<div className={classes.root}>
			<AppBar position="static">
				<Toolbar variant="dense">
					<Logo/>
					<RouteTabs/>
					<UserMenu/>
				</Toolbar>
			</AppBar>
			<Container maxWidth={false} disableGutters={true} className={classes.container} children={children}/>
		</div>
	);
};

Layout.displayName = Layout.name