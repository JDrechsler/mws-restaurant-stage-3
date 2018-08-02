importScripts('js/idb-keyval-iife.min.js', 'js/dbhelper.js');

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
  'js/restaurant_info.js',
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

const removeItemsFromIDB = async () => {
  await idbKeyval.del('reviewsReadyForSync');
  console.log('Removed outgoing items for service worker from idb');
};

self.addEventListener('sync', event => {
  console.log('syncing event');
  if (event.tag === 'syncReviews') {
    event.waitUntil(
      syncReviewsWithServer()
        .then(res => {
          console.log(res);
        })
        .catch(err => {
          console.log(err);
        })
    );
  }
});

/**
 *
 * @returns {Promise<string>}
 */
const syncReviewsWithServer = async () => {
  console.log('syncing reviews');
  const reviewsReadyForSync = await idbKeyval.get('reviewsReadyForSync');
  if (reviewsReadyForSync === undefined) {
    console.log(
      'No reviews found in idb that are ready to be synced with server.'
    );
  } else {
    reviewsReadyForSync.forEach(async review => {
      console.log('adding new review from idb to server', review);
      await addReviewToDB(
        review.restaurant_id,
        review.name,
        review.rating,
        review.comments
      );
    });
    await removeItemsFromIDB();
    return Promise.resolve('Sync IDB with server is done.');
  }
};

/**
 * Adds a new review to the DB
 * @param restaurant_id {number}
 * @param reviewer_name {string}
 * @param rating {number}
 * @param comment {string}
 * @returns {Promise<void>}
 */
const addReviewToDB = async (restaurant_id, reviewer_name, rating, comment) => {
  try {
    await fetch(`${DBHelper.DATABASE_URL}/reviews/`, {
      method: 'POST',
      body: JSON.stringify({
        restaurant_id: restaurant_id,
        name: reviewer_name,
        rating: rating,
        comments: comment
      })
    });
  } catch (error) {
    console.log(error);
  }
};
