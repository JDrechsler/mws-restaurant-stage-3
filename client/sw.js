// TODO Defer Updates
// Add functionality to defer updates until the user is connected:
// If the user is not online, the app should notify the user that they are not connected,
// and save the users' data to submit automatically when re-connected.
// In this case, the review should be deferred and sent to the server when connection
// is re - established(but the review should still be visible locally even before it gets to the server.)

const staticCache = 'mws-p1-static-cache-1';
const dynamicCache = 'mws-p1-dynamic-cache-1';
const staticUrlsToCache = [
  './',
  'index.html',
  'css/styles.css',
  'css/leaflet.css',
  'assets/star_white.png',
  'assets/star_full.png',
  'assets/restaurant.ico',
  'css/images/marker-icon.png',
  'css/images/marker-shadow.png',
  'js/main.js',
  'js/dbhelper.js',
  'restaurant_info.js',
  'js/idb-keyval-iife.min.js',
  'js/leaflet.js',
  'restaurant.html',
  '404.html',
  'offline.html',
  'manifest.json'
];

const cacheStaticResources = async () => {
  const cache = await caches.open(staticCache);
  try {
    await cache.addAll(staticUrlsToCache);
    console.log('cached static resources');
  } catch (error) {
    console.log(`An error happened during static assets caching: ${error}`);
  }
};

/**
 * @param {RequestInfo} request
 */
const useResourceStrategy = async request => {
  try {
    /**
     * @type {Response | undefined}
     */
    const response = await caches.match(request);
    if (response) {
      //if in cache use cache
      return response;
    } else {
      //if not in cache try to fetch using internet
      const fetchResponse = await fetch(request);
      //if response 404 (does not exist)
      if (fetchResponse.status === 404) {
        // use offline fallback page
        return await caches.match('404.html');
      } else {
        addResourceToDynamicCache(request, fetchResponse.clone());
        return fetchResponse;
      }
    }
  } catch (error) {
    console.log(error);

    return await caches.match('offline.html');
  }
};

/**
 * @param {RequestInfo} request
 * @param {Response} res
 */
const addResourceToDynamicCache = async (request, res) => {
  try {
    const dynCache = await caches.open(dynamicCache);
    dynCache.put(request, res);
  } catch (error) {
    console.log(error);
  }
};

self.addEventListener('install', (/** @type {ExtendableEvent} */ event) => {
  console.log('SW: Install Event');
  event.waitUntil(cacheStaticResources());
});

self.addEventListener('activate', () => {
  console.log('SW: Activate Event');
});

self.addEventListener('fetch', (/** @type {FetchEvent} */ event) => {
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(useResourceStrategy(event.request));
  }
});
