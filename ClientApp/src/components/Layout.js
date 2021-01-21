import React, {Component} from 'react';
import {Container} from '@material-ui/core';
import ResponsiveDrawer from './NavMenu';

export class Layout extends Component {
	static displayName = Layout.name;

	render() {
		return (
			<div>
				<ResponsiveDrawer/>
				<Container>
					{this.props.children}
				</Container>
			</div>
		);
	}
}
