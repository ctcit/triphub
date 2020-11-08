import 'react-app-polyfill/ie11';
import 'react-app-polyfill/stable';
import { App } from './App';
import { PublicTripList } from './PublicTripList';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.css';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './index.css';
// import autosize from 'autosize';

// use this chrome plugin to get this working if running locally using "npm start"
// https://chrome.google.com/webstore/detail/allow-control-allow-origi/nlfbmbojpeacfghkpbjhddihlkkiljbi/related?hl=en

export const BaseUrl = 'https://ctc.org.nz/triphub/api/api.php'
export const DbApiURL = 'https://ctc.org.nz/db/index.php/rest'
export const BaseOpt = { 'Accept': 'application/json'}
export const NewsletterGenerateUrl = '/newsletter/generate.php?expand=newsletter.odt'

// This is intentionally *not* the top window hash as when running
// in an iframe we want to get the path the iframe references
const path = window.location.hash.replace('#','')

if (path.startsWith('/public')) {
    ReactDOM.render(<PublicTripList path={path.replace('/public','')}/>, document.getElementById('root'))
} else {
    ReactDOM.render(<App/>, document.getElementById('root'))
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
            registration.unregister();
        }
    });
}
