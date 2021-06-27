import 'fontsource-roboto';
import React from 'react';
import {Route} from 'react-router';
import Layout from './components/Layout';
import {Counter} from './components/Counter';
import {Tasks} from "./Pages/Tasks";

export default function App() {

	return <Layout>
		<Route key="Tasks" exact path='/' component={Tasks}/>
		<Route key="Counter" path='/counter' component={Counter}/>
	</Layout>;
}
App.displayName = App.name
