import 'fontsource-roboto';
import React, {Component} from 'react';
import {Route} from 'react-router';
import {Button} from '@material-ui/core';


import {Layout} from './components/Layout';
import {Tasks} from './Pages/Tasks/Tasks';
//import { FetchData } from './components/FetchData';
import {Counter} from './components/Counter';
import axios from 'axios';

export default class App extends Component {
	static displayName = App.name;



	async abc9() {
		debugger
		const response = await fetch('weatherforecast');
		const data = await response.json();
		const response1 = await axios.get('weatherforecast');

	}

	render() {
		return (
			<Layout>
				<Route exact path='/' component={Tasks} />
				<Route path='/counter' component={Counter}/>
				{/*<Route path='/fetch-data' component={FetchData} />*/}
			</Layout>
		);
	}
}
