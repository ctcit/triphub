/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules
// for the list of available Workbox modules, or add any other
// code you'd like.
// You can also remove this file if you'd prefer not to use a
// service worker, and the Workbox build step will be skipped.

import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { clientsClaim, WorkboxPlugin } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL, cleanupOutdatedCaches, PrecacheEntry } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly, NetworkFirst } from 'workbox-strategies';
import { TripsService } from './Services/TripsService';
import { TripsCacheUpdaterPlugin } from './TripsCacheUpdaterPlugin';

declare const self: ServiceWorkerGlobalScope;

// This allows the web app to trigger skipWaiting via
// registration.waiting.postMessage({type: 'SKIP_WAITING'})
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

clientsClaim();
// cleanupOutdatedCaches();

// -------------------------------------------
// Precaching

// Precache all of the assets generated by your build process.
// Their URLs are injected into the manifest variable below.
// This variable must be present somewhere in your service worker file,
// even if you decide not to use precaching. See https://cra.link/PWA

// default static file URLs generated during the build process
const staticBuildFiles = self.__WB_MANIFEST as PrecacheEntry[];

// extra file URLs to be precached
const extraPrecachedFiles: string[] = [
  `${process.env.PUBLIC_URL}/CTCLogo.png`,
  `${process.env.PUBLIC_URL}/favicon.ico`,
  `${process.env.PUBLIC_URL}/icon-72x72.png`,
  `${process.env.PUBLIC_URL}/icon-96x96.png`,
  `${process.env.PUBLIC_URL}/icon-128x128.png`,
  `${process.env.PUBLIC_URL}/icon-144x144.png`,
  `${process.env.PUBLIC_URL}/icon-288x288.png`,
  `${process.env.PUBLIC_URL}/icon-512x512.png`,
  `${process.env.PUBLIC_URL}/manifest.json`,
  `${process.env.PUBLIC_URL}/runtime-config.js`,
  `${process.env.PUBLIC_URL}/print.css`, // ???
  "https://unpkg.com/leaflet@1.3.1/dist/leaflet.css"
];

// register all assets to be precached by the service worker
precacheAndRoute([
  ...staticBuildFiles,
  ...extraPrecachedFiles.map((url) => ({ url, revision: null }))
]);

// Set up App Shell-style routing, so that all navigation requests
// are fulfilled with your index.html shell. Learn more at
// https://developers.google.com/web/fundamentals/architecture/app-shell
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  // Return false to exempt requests from being fulfilled by index.html.
  ({ request, url }: { request: Request; url: URL }) => {
    // If this isn't a navigation, skip.
    if (request.mode !== 'navigate') {
      return false;
    }

    // If this is a URL that starts with /_, skip.
    if (url.pathname.startsWith('/_')) {
      return false;
    }

    // If this looks like a URL for a resource, because it contains
    // a file extension, skip.
    if (url.pathname.match(fileExtensionRegexp)) {
      return false;
    }

    // Return true to signal that we want to use the handler.
    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

// -------------------------------------------
// API caching

// GET trips/{id} and GET trips/{id}/participants/{pid}
registerRoute(
  /.*\/api\/api.php\/trips\/\d*(\/participants)?/, 
  new NetworkFirst({
    cacheName: 'trips',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  }),
  'GET'
);

// Other selected GETs
registerRoute(
  /.*\/api\/api.php\/((members)|(config)|(maps)|(public_holidays)|(trips))/, 
  new NetworkFirst({
    cacheName: 'gets',
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// Any other custom service worker logic can go here.
const bgSyncPlugin = new BackgroundSyncPlugin('syncs', {
  maxRetentionTime: 24 * 60 // Retry for max of 24 Hours (specified in minutes)
});

// class TripsCacheUpdaterPlugin implements WorkboxPlugin {
//   fetchDidFail: WorkboxPlugin['fetchDidFail'] = async ({request}) => {
//     await TripsService.updateTripsCache(request);
//   };
// }
// const tripsCacheUpdaterPlugin = new TripsCacheUpdaterPlugin();

// POST members/{id}
registerRoute(
  /.*\/api\/api.php\/members\/\d*$/,
  new NetworkOnly({
    plugins: [bgSyncPlugin]
  }),
  'POST'
);

// POST trips/{id}
// POST trips/{id}/participants
// POST trips/{id}/participants/{pid}
// POST trips/{id}/email
registerRoute(
  /.*\/api\/api.php\/trips\/\d*(\/((participants(\/\d*)?)|(email)))?$/,
  new NetworkOnly({
    plugins: [bgSyncPlugin]
  }),
  'POST'
);

