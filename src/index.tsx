import { App } from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './index.css';
// import autosize from 'autosize';

// use this chrome plugin to get this working if running locally using "npm start"
// https://chrome.google.com/webstore/detail/allow-control-allow-origi/nlfbmbojpeacfghkpbjhddihlkkiljbi/related?hl=en

export const BaseUrl = 'https://ctc.org.nz/triphub.dev/api/api.php'
export const DbApiURL = 'http://ctc.org.nz/db/index.php/rest'
export const BaseOpt = { 'Accept': 'application/json'}
export const NewsletterGenerateUrl = '/newsletter/generate.php?expand=newsletter.odt'

ReactDOM.render(<App/>, document.getElementById('root'))
// registerServiceWorker()
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
            registration.unregister();
        }
    });
}
