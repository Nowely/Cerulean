import ReactDOM from 'react-dom/client'
import {BrowserRouter} from 'react-router-dom';
import App from './App';

const baseUrl = document.getElementsByTagName('base')[0].getAttribute('href') ?? "/";

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <BrowserRouter basename={baseUrl}>
        <App/>
    </BrowserRouter>
)


