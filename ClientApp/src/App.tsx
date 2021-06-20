import 'fontsource-roboto';
import React, {Component} from 'react';
import {Route} from 'react-router';
import {Layout} from './components/Layout';
import {Counter} from './components/Counter';
import {Tasks} from "./Pages/Tasks";

export default class App extends Component {
	static displayName = App.name;

	render() {
		return (
			<Layout>
				<Route exact path='/' component={Tasks} />
				<Route path='/counter' component={Counter}/>
			</Layout>
		);
	}
}
