import 'react-app-polyfill/ie11';
import 'react-app-polyfill/stable';
import { App } from './App';
import { PublicTripList } from './PublicTripList';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.css';
import './index.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { createRoot } from 'react-dom/client';
import 'react-toastify/dist/ReactToastify.css';

// use this chrome plugin to get this working if running locally using "npm start"
// https://chrome.google.com/webstore/detail/allow-control-allow-origi/nlfbmbojpeacfghkpbjhddihlkkiljbi/related?hl=en

// use run-time config settings (from optional "%PUBLIC_URL%/runtime-config.js") otherwise default to production settings
//
// // example runtime-config.js
//
// or just temporarily uncomment these lines:
//
//(window as any).RunConfig = {
//    ApiKey: 'C5HFNPH2H887JJ4B9H22UMC42DMHVL4VVUCD84WGKEWMQG2RUZ',
//    BaseUrl: 'https://ctc.org.nz/triphub/api/api.php',
//    DbApiURL: 'https://ctc.org.nz/db/index.php/rest'
//}

const runConfig: any = (window as any).RunConfig;
export const BaseUrl = runConfig?.BaseUrl ?? 'https://ctc.org.nz/triphub/api/api.php';
export const DbApiURL = runConfig?.DbApiURL ?? 'https://ctc.org.nz/db/index.php/rest';
export const BaseOpt = { 'Accept': 'application/json' }
if (runConfig?.ApiKey) {
    (BaseOpt as any)['Api-Key'] = runConfig.ApiKey;
}
export const NewsletterGenerateUrl = '/db/generate.php?expand=newsletter.odt'

// This is intentionally *not* the top window hash as when running
// in an iframe we want to get the path the iframe references
const path = window.location.hash.replace('#','')
const container = document.getElementById('root')
const root = createRoot(container!)
if (path.startsWith('/public')) {
    root.render(<PublicTripList path={path.replace('/public','')}/>)
} else {
    root.render(<App/>)
}

serviceWorkerRegistration.register();
