import 'fontsource-roboto';
import React from 'react';
import {Route} from 'react-router';
import Layout from './components/Layout';
import {Counter} from './components/Counter';
import {Tasks} from "./Pages/Tasks";

export default function App() {

	return <Layout>
		<Route key="Tasks" path='/' element={<Tasks/>}/>
		<Route key="Counter" path='/counter' element={<Counter/>}/>
	</Layout>;
}
App.displayName = App.name
