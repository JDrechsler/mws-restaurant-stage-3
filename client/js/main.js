/** @type {Array<Restaurant>} */ let restaurants;
/** @type {Array<string>} */ let neighborhoods;
/** @type {Array<string>} */ let cuisines;
var newMap;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', event => {
  initMap();
  fetchNeighborhoods();
  fetchCuisines();
  registerServiceWorker();
});

const initMap = () => {
  self.newMap = L.map('map', {
    center: [40.722216, -73.987501],
    zoom: 12,
    scrollWheelZoom: false
  });
  L.tileLayer(
    'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}',
    {
      mapboxToken:
        'pk.eyJ1IjoiamRyZWNoc2xlciIsImEiOiJjamluYnV4eHowMjk0M3FtcmdzbGozc3ZqIn0.FvnlLMeArd9qAUIcZ6e-NA',
      maxZoom: 18,
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox.streets'
    }
  ).addTo(newMap);

  updateRestaurants();
};

const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('sw.js');
        console.log('Registration successful. Scope is ' + reg.scope);
      } catch (error) {
        console.log('Registration failed.', error);
      }
    });
  }
};

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = async () => {
  try {
    const neighborhoods = await DBHelper.fetchNeighborhoods();
    self.neighborhoods = neighborhoods;
    fillNeighborhoodsHTML();
  } catch (error) {
    console.error(error);
  }
};

/**
 * Set neighborhoods HTML.
 * @param {Array<string> neighborhoods}
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.appendChild(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = async () => {
  try {
    const cuisines = await DBHelper.fetchCuisines();
    self.cuisines = cuisines;
    fillCuisinesHTML();
  } catch (error) {
    console.error(error);
  }
};

/**
 * Set cuisines HTML.
 * @param {Array<string>} cuisines
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.appendChild(option);
  });
};

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = async () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  try {
    const restaurantsByCuisineAndNeighborhood = await DBHelper.fetchRestaurantByCuisineAndNeighborhood(
      cuisine,
      neighborhood
    );
    resetRestaurants(restaurantsByCuisineAndNeighborhood);
    fillRestaurantsHTML();
    updateResultsCount();
    lazyLoadImages();
  } catch (error) {
    console.error(error);
  }
};

const lazyLoadImages = () => {
  var myLazyLoad = new LazyLoad({
    elements_selector: '.lazy'
  });
};

/**
 * Update results with aria-live
 */
const updateResultsCount = () => {
  const resultsList = document.getElementById('restaurants-list');
  const numResults = resultsList.children.length;
  const spanCountElement = document.getElementsByClassName('results-count')[0];
  if (numResults < 1) {
    spanCountElement.textContent = '(No results found)';
  } else if (numResults === 1) {
    spanCountElement.textContent = '(1 result found)';
  } else {
    spanCountElement.textContent = `(${numResults} results found)`;
  }
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 * @param {Array<Restaurant>} restaurants
 */
const resetRestaurants = restaurants => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 * @param {Array<Restaurant>} restaurants
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.appendChild(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};

/**
 * Create restaurant HTML.
 * @param {Restaurant} restaurant
 */
const createRestaurantHTML = restaurant => {
  const li = document.createElement('li');
  const image = document.createElement('img');
  image.className = 'restaurant-img lazy';
  /**@type {string} */
  const imgSrc = DBHelper.imageUrlForRestaurant(restaurant) + '_400.jpg';

  const imgSrc200 = imgSrc.replace('_400', '_200');
  const imgSrc400 = imgSrc;

  image.setAttribute('data-src', imgSrc);
  image.setAttribute('data-srcset', `${imgSrc200} 200w, ${imgSrc400} 400w`);
  image.setAttribute(
    'data-sizes',
    `(max-width: 350px) 200px, (min-width: 400px) 250px`
  );

  image.alt = DBHelper.imageAltForRestaurant(restaurant);
  li.appendChild(image);

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  name.tabIndex = '0';
  li.appendChild(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.appendChild(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.appendChild(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.appendChild(more);

  return li;
};

/**
 * Add markers for current restaurants to the map.
 * @param {Array<Restaurant>} restaurants
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on('click', onClick);

    function onClick() {
      window.location.href = marker.options.url;
    }

    self.markers.push(marker);
  });
};

//Lazy Load Library https://github.com/verlok/lazyload
var _extends =
    Object.assign ||
    function(e) {
      for (var t = 1; t < arguments.length; t++) {
        var n = arguments[t];
        for (var r in n)
          Object.prototype.hasOwnProperty.call(n, r) && (e[r] = n[r]);
      }
      return e;
    },
  _typeof =
    'function' == typeof Symbol && 'symbol' == typeof Symbol.iterator
      ? function(e) {
          return typeof e;
        }
      : function(e) {
          return e &&
            'function' == typeof Symbol &&
            e.constructor === Symbol &&
            e !== Symbol.prototype
            ? 'symbol'
            : typeof e;
        };
!(function(e, t) {
  'object' ===
    ('undefined' == typeof exports ? 'undefined' : _typeof(exports)) &&
  'undefined' != typeof module
    ? (module.exports = t())
    : 'function' == typeof define && define.amd
      ? define(t)
      : (e.LazyLoad = t());
})(this, function() {
  'use strict';
  var r = 'data-',
    s = 'was-processed',
    a = 'true',
    l = function(e, t) {
      return e.getAttribute(r + t);
    },
    o = function(e) {
      return (t = s), (n = a), e.setAttribute(r + t, n);
      var t, n;
    },
    i = function(e) {
      return l(e, s) === a;
    };
  function c(e) {
    return e.filter(function(e) {
      return !i(e);
    });
  }
  var u = function(e, t) {
    var n,
      r = 'LazyLoad::Initialized',
      s = new e(t);
    try {
      n = new CustomEvent(r, { detail: { instance: s } });
    } catch (e) {
      (n = document.createEvent('CustomEvent')).initCustomEvent(r, !1, !1, {
        instance: s
      });
    }
    window.dispatchEvent(n);
  };
  var d = function(e, t, n) {
      for (var r, s = 0; (r = e.children[s]); s += 1)
        if ('SOURCE' === r.tagName) {
          var a = l(r, n);
          a && r.setAttribute(t, a);
        }
    },
    f = function(e, t, n) {
      n && e.setAttribute(t, n);
    },
    v = function(e, t) {
      var n = t.data_sizes,
        r = t.data_srcset,
        s = t.data_src,
        a = l(e, s);
      switch (e.tagName) {
        case 'IMG':
          var o = e.parentNode;
          o && 'PICTURE' === o.tagName && d(o, 'srcset', r);
          var i = l(e, n);
          f(e, 'sizes', i);
          var c = l(e, r);
          f(e, 'srcset', c), f(e, 'src', a);
          break;
        case 'IFRAME':
          f(e, 'src', a);
          break;
        case 'VIDEO':
          d(e, 'src', s), f(e, 'src', a);
          break;
        default:
          a && (e.style.backgroundImage = 'url("' + a + '")');
      }
    },
    e = 'undefined' != typeof window,
    t = e && 'IntersectionObserver' in window,
    _ = e && 'classList' in document.createElement('p'),
    m = function(e, t) {
      _ ? e.classList.add(t) : (e.className += (e.className ? ' ' : '') + t);
    },
    b = function(e, t) {
      e && e(t);
    },
    h = 'load',
    p = 'error',
    y = function(e, t, n) {
      e.removeEventListener(h, t), e.removeEventListener(p, n);
    },
    g = function(n, r) {
      var s = function e(t) {
          E(t, !0, r), y(n, e, a);
        },
        a = function e(t) {
          E(t, !1, r), y(n, s, e);
        };
      n.addEventListener(h, s), n.addEventListener(p, a);
    },
    E = function(e, t, n) {
      var r,
        s,
        a = e.target;
      (r = a),
        (s = n.class_loading),
        _
          ? r.classList.remove(s)
          : (r.className = r.className
              .replace(new RegExp('(^|\\s+)' + s + '(\\s+|$)'), ' ')
              .replace(/^\s+/, '')
              .replace(/\s+$/, '')),
        m(a, t ? n.class_loaded : n.class_error),
        b(t ? n.callback_load : n.callback_error, a);
    };
  var n = function(e, t) {
    var n;
    (this._settings = ((n = {
      elements_selector: 'img',
      container: document,
      threshold: 300,
      data_src: 'src',
      data_srcset: 'srcset',
      data_sizes: 'sizes',
      class_loading: 'loading',
      class_loaded: 'loaded',
      class_error: 'error',
      callback_load: null,
      callback_error: null,
      callback_set: null,
      callback_enter: null
    }),
    _extends({}, n, e))),
      this._setObserver(),
      this.update(t);
  };
  n.prototype = {
    _setObserver: function() {
      var r = this;
      if (t) {
        var e;
        this._observer = new IntersectionObserver(
          function(e) {
            e.forEach(function(e) {
              if ((n = e).isIntersecting || 0 < n.intersectionRatio) {
                var t = e.target;
                r.load(t), r._observer.unobserve(t);
              }
              var n;
            }),
              (r._elements = c(r._elements));
          },
          {
            root:
              (e = this._settings).container === document ? null : e.container,
            rootMargin: e.threshold + 'px'
          }
        );
      }
    },
    loadAll: function() {
      var t = this;
      this._elements.forEach(function(e) {
        t.load(e);
      }),
        (this._elements = c(this._elements));
    },
    update: function(e) {
      var t = this,
        n = this._settings,
        r = e || n.container.querySelectorAll(n.elements_selector);
      (this._elements = c(Array.prototype.slice.call(r))),
        this._observer
          ? this._elements.forEach(function(e) {
              t._observer.observe(e);
            })
          : this.loadAll();
    },
    destroy: function() {
      var t = this;
      this._observer &&
        (c(this._elements).forEach(function(e) {
          t._observer.unobserve(e);
        }),
        (this._observer = null)),
        (this._elements = null),
        (this._settings = null);
    },
    load: function(e, t) {
      var n, r;
      (n = e),
        (r = this._settings),
        (!t && i(n)) ||
          (b(r.callback_enter, n),
          -1 < ['IMG', 'IFRAME', 'VIDEO'].indexOf(n.tagName) &&
            (g(n, r), m(n, r.class_loading)),
          v(n, r),
          o(n),
          b(r.callback_set, n));
    }
  };
  var w = window.lazyLoadOptions;
  return (
    e &&
      w &&
      (function(e, t) {
        if (t.length) for (var n, r = 0; (n = t[r]); r += 1) u(e, n);
        else u(e, t);
      })(n, w),
    n
  );
});
