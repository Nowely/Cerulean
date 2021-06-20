import 'fontsource-roboto';
import React from 'react';
import {Route} from 'react-router';
import {Layout} from './components/Layout';
import {Counter} from './components/Counter';
import {Tasks} from "./Pages/Tasks";
import {Store} from "./Stores/Store";

export default function App() {
	let storage = Store.instance;

	return <Layout>
		<Route exact path='/' component={Tasks}/>
		<Route path='/counter' component={Counter}/>
	</Layout>;
}
App.displayName = App.name
