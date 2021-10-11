import React, {ReactElement, useMemo} from "react";
import {styled} from '@mui/material/styles';
import {AppBar, Tabs, Tab, Toolbar, Container, IconButton, Typography} from '@mui/material';
import WhatshotRoundedIcon from '@mui/icons-material/WhatshotRounded';
import {Route, Link} from "react-router-dom";
import {UserMenu} from "./UserMenu";

const PREFIX = 'Layout';

const classes = {
	root: `${PREFIX}-root`,
	routeTab: `${PREFIX}-routeTab`,
	title: `${PREFIX}-title`,
	container: `${PREFIX}-container`,
};

const Root = styled('div')(({theme}) => ({
	[`&.${classes.root}`]: {
		flexGrow: 1,
		backgroundColor: theme.palette.background.paper,
	},

	[`& .${classes.routeTab}`]: {
		textTransform: 'none',
		minWidth: 122,
		fontSize: "medium",
		marginLeft: theme.spacing(1),
		'&:hover': {
			color: '#40a9ff',
			opacity: 1,
		},
	},

	[`& .${classes.title}`]: {
		display: 'none',
		[theme.breakpoints.up('sm')]: {
			display: 'block',
		},
	},

	[`& .${classes.container}`]: {
		marginTop: 10,
		display: 'flex',
		flexWrap: 'wrap'
	}
}));

interface LayoutProps {
	children: ReactElement[],
}

export const Layout = ({children}: LayoutProps) => {

	const Logo = () => <>
		<IconButton edge="start" color="inherit" aria-label="menu" children={<WhatshotRoundedIcon/>}/>
		<Typography className={classes.title} variant="h6" noWrap children="Cerulean"/>
	</>

	const LinkTab = useMemo(() => children.map(child =>
			<Tab className={classes.routeTab} key={child.key} label={child.key} to={child.props.path}
				 value={child.props.path} component={Link}/>),
		[children]);
	const RouteTabs = () =>
		<Route path="/" render={({location}) =>
			<Tabs
				indicatorColor="secondary"
				textColor="inherit"
				value={location.pathname}> {LinkTab} </Tabs>}/>;

	//TODO more Pretty
	//TODO route to single component
	//TODO single styled
	return (
		<Root className={classes.root}>
			<AppBar position="static">
				<Toolbar variant="dense">
					<Logo/>
					<RouteTabs/>
					<UserMenu/>
				</Toolbar>
			</AppBar>
			<Container maxWidth={false} disableGutters={true} className={classes.container} children={children}/>
		</Root>
	);
};

Layout.displayName = Layout.name