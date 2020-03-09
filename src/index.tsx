import { App } from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './index.css';
import registerServiceWorker from './registerServiceWorker';
// import autosize from 'autosize';

// use this chrome plugin to get this working if running locally using "npm start"
// https://chrome.google.com/webstore/detail/allow-control-allow-origi/nlfbmbojpeacfghkpbjhddihlkkiljbi/related?hl=en
export const BaseUrl = 'https://ctc.org.nz/triphub.alastair/api/api.php'
export const BaseOpt = {'Api-Key':'6bc3ed05-66a4-4012-96bd-c7192df95997', 'Api-UserId':'0'}
export const Spinner = <span className='fa fa-spinner fa-spin' key='spinner'/>

ReactDOM.render(<App/>, document.getElementById('root'))
registerServiceWorker()

