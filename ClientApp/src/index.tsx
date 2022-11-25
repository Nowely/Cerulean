import ReactDOM from 'react-dom';
import {BrowserRouter} from 'react-router-dom';
import App from './App';

const baseUrl: string = document.getElementsByTagName('base')[0].getAttribute('href') ?? "/";
const rootElement: HTMLElement | null = document.getElementById('root');

ReactDOM.render(
    <BrowserRouter basename={baseUrl}>
        <App/>
    </BrowserRouter>,
    rootElement);


