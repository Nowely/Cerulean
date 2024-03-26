import 'fontsource-roboto';
import {Route} from 'react-router';
import Layout from './components/Screen';
import {Counter} from './components/Counter';
import {Tasks} from "./Pages/Tasks";
import {Board} from "./components/Board";

export default function App() {

    return <>
        <Layout>
            <Route key="Tasks" path='/' element={<Tasks/>}/>
            <Route key="Counter" path='/counter' element={<Counter/>}/>
            <Route key="Board" path='/board' element={<Board/>}/>
        </Layout>
    </>
}

App.displayName = App.name
