/** @type {Restaurant} */ let restaurant;
/** @type {Array<Restaurant>} */ let restaurants;
/** @type {Array<Review>} */ let reviews;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  self.restaurants = await DBHelper.fetchRestaurants();
});

const initMap = async () => {
  const restaurant = await fetchRestaurantFromURL();

  self.newMap = L.map('map', {
    center: [restaurant.latlng.lat, restaurant.latlng.lng],
    zoom: 16,
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
  fillBreadcrumb();
  DBHelper.mapMarkerForRestaurant(self.restaurant);
};

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = async () => {
  if (self.restaurant) {
    // restaurant already fetched!
    return self.restaurant;
  }
  const id = Number(getParameterByName('id'));

  if (id) {
    const restaurant = await DBHelper.fetchRestaurantById(id);
    self.restaurant = restaurant;
    if (!restaurant) {
      console.error('No restaurants found');
      return;
    }
    fillRestaurantHTML();
    return restaurant;
  } else {
    // no id found in URL
    return 'No restaurant id in URL';
  }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = async (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.setAttribute('aria-label', `Restaurant: ${restaurant.name}`);
  name.innerText = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.setAttribute('aria-label', `Address: ${restaurant.address}`);
  address.innerText = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';

  /**@type {string} */
  const imgSrc = DBHelper.imageUrlForRestaurant(restaurant) + '_400.jpg';
  const imgSrc200 = imgSrc.replace('_400', '_200');
  image.srcset = `${imgSrc200} 200w, ${imgSrc} 400w`;
  image.sizes = `(max-width: 350px) 200px, (min-width: 400px) 250px`;
  image.src = imgSrc;
  image.alt = DBHelper.imageAltForRestaurant(restaurant);

  const btnFav = document.createElement('button');
  btnFav.setAttribute(
    'aria-label',
    'Use this button to toggle the favorite status of this restaurant.'
  );

  if (restaurant.is_favorite) {
    btnFav.className = 'fav';
  } else {
    btnFav.className = 'notfav';
  }

  btnFav.addEventListener('click', async () => {
    if (restaurant.is_favorite) {
      self.restaurants[restaurant.id - 1].is_favorite = false;
      await DBHelper.unmarkRestaurantAsFavorite(restaurant);
      btnFav.className = 'notfav';
    } else {
      self.restaurants[restaurant.id - 1].is_favorite = true;
      await DBHelper.markRestaurantAsFavorite(restaurant);
      btnFav.className = 'fav';
    }
    DBHelper.updateIDB(self.restaurants);
  });

  document.getElementById('restaurant-img-cuisine').appendChild(btnFav);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.setAttribute('aria-label', `Cuisine: ${restaurant.cuisine_type}`);
  cuisine.innerText = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  await fillReviewsHTML(restaurant);
  updateAverageRatingView();
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (
  operatingHours = self.restaurant.operating_hours
) => {
  const hours = document.getElementById('restaurant-hours');
  const caption = document.createElement('caption');
  caption.setAttribute('aria-label', 'Restaurant hours');
  hours.appendChild(caption);

  for (let key in operatingHours) {
    const row = document.createElement('tr');
    const day = document.createElement('td');
    day.innerText = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerText = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 *
 * @return {Promise<void>}
 * @param restaurant {Restaurant}
 */
const fillReviewsHTML = async restaurant => {
  const id = Number(getParameterByName('id'));
  let reviews = await DBHelper.fetchReviewsById(id);
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerText = 'Reviews';
  title.tabIndex = 0;
  title.id = 'reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerText = 'No reviews yet!';
    noReviews.tabIndex = 0;
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');

  ul.appendChild(await createAddReviewHTML(restaurant));

  document.getElementById('ratingChoice').textContent = countStars().toString();

  reviews.forEach(r => {
    if (typeof r.createdAt === 'string') {
      r.createdAt = Date.parse(r.createdAt);
    }
  });

  reviews.sort((a, b) => b.createdAt - a.createdAt);

  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Adds a custom review to the reviews list
 */
const addCustomReviewToView = review => {
  const ul = document.getElementById('reviews-list');
  ul.insertBefore(
    createReviewHTML(review),
    ul.firstElementChild.nextElementSibling
  );
  updateAverageRatingView();
};

/**
 * Create review HTML and add it to the webpage.
 * @param review {Review}
 * @return {HTMLElement}
 */
const createReviewHTML = review => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerText = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  const dateCreated = new Date(review.createdAt);
  date.innerText = dateCreated.toLocaleString();
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerText = `Rating: ${'★'.repeat(review.rating)}`;
  rating.setAttribute('aria-label', `${review.rating} stars`);
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerText = review.comments;
  li.tabIndex = 0;
  li.appendChild(comments);

  return li;
};

/**
 * Submits the review
 * @param restaurant {Restaurant}
 */
const submitReview = async restaurant => {
  const reviewer_name = document.getElementById('user').value;
  const comment = document.getElementById('reviewComment').value;
  const rating = Number(document.getElementById('ratingChoice').innerText);

  if (reviewer_name.length < 1 || comment.left < 1) {
    alert('Please make sure to enter your name and a comment.');
    return;
  }

  console.log(`${reviewer_name}, ${restaurant.id}, ${rating}, ${comment}`);
  await DBHelper.addReviewToDB(restaurant.id, reviewer_name, rating, comment);
  console.log('New Review added to DB');

  const review = {
    name: reviewer_name,
    createdAt: Date.now(),
    rating: rating,
    comments: comment
  };
  addCustomReviewToView(review);
  emptyReviewForm();
};

const emptyReviewForm = () => {
  document.getElementById('user').value = '';
  document.getElementById('reviewComment').value = '';
};

/**
 * Create add review HTML and add it to the webpage.
 * @return {Promise<HTMLElement>}
 * @param restaurant {Restaurant}
 */
const createAddReviewHTML = async restaurant => {
  //TODO add a11y for screen readers
  //TODO check tab order

  const li = document.createElement('li');
  li.id = 'addReviewForm';

  const userRating = document.createElement('p');
  userRating.id = 'userRating';
  li.appendChild(userRating);

  const header = document.createElement('h3');
  header.innerText = `Add own review for: ${restaurant.name} (ID: ${
    restaurant.id
  })`;
  li.appendChild(header);

  const username = document.createElement('input');
  username.id = 'user';
  username.placeholder = 'Enter your name';

  li.appendChild(username);

  li.appendChild(buildRatingsHTML());

  const commentTextArea = document.createElement('textarea');
  commentTextArea.className = 'addReviewTextArea';
  commentTextArea.id = 'reviewComment';
  commentTextArea.placeholder = 'Enter your comment';
  li.appendChild(commentTextArea);

  const submitReviewBtn = document.createElement('button');
  submitReviewBtn.textContent = 'Submit Review';
  submitReviewBtn.addEventListener('click', () => {
    console.log('clicked');
    submitReview(restaurant);
  });

  li.appendChild(submitReviewBtn);

  return li;
};

/**
 * Returns average reviews rating from db
 * @returns {Promise<number>}
 */
const getAverageRating = async () => {
  const ratings = await DBHelper.fetchReviewsById(self.restaurant.id);
  let sumRatings = 0;
  for (let currRating of ratings) {
    sumRatings += Number(currRating.rating);
  }
  return sumRatings / ratings.length;
};

/**
 * Updates shown reviews average
 * @returns {Promise<void>}
 */
const updateAverageRatingView = async () => {
  const averageRating = await getAverageRating();
  const ratings = await DBHelper.fetchReviewsById(self.restaurant.id);
  const userRatingEl = document.getElementById('userRating');
  userRatingEl.textContent = `User Rating: ${'★'.repeat(
    Number(averageRating.toPrecision(1))
  )} (${averageRating.toFixed(1)}) based on ${ratings.length} reviews.`;
};

/**
 * Builds ratings element and returns it
 * @returns {HTMLElement}
 */
const buildRatingsHTML = () => {
  const ratingsDiv = document.createElement('div');
  ratingsDiv.id = 'star-rating';

  //initial idea from https://stackoverflow.com/questions/49218516/creating-simple-star-rating-using-click-event-javascript#

  ratingsDiv.addEventListener('click', event => {
    let performAction = 'add';
    for (const span of ratingsDiv.children) {
      span.classList[performAction]('star_full');
      if (span === event.target) {
        performAction = 'remove';
      }
    }

    let amountStars = 0;
    ratingsDiv.childNodes.forEach(n => {
      if (n.className === 'spanStar star_full') {
        amountStars += 1;
      }
    });

    document.getElementById(
      'ratingChoice'
    ).textContent = amountStars.toString();
  });

  for (let i = 0; i < 5; i++) {
    const spanEl = document.createElement('span');
    spanEl.className = 'spanStar';
    if (i === 0) {
      spanEl.className = 'spanStar star_full';
    }
    ratingsDiv.appendChild(spanEl);
  }

  const spanRatingChoice = document.createElement('span');
  spanRatingChoice.id = 'ratingChoice';
  ratingsDiv.appendChild(spanRatingChoice);

  return ratingsDiv;
};

/**
 * Returns amount stars selected
 */
const countStars = () => {
  const ratingsDiv = document.getElementById('star-rating');
  let amountStars = 0;
  ratingsDiv.childNodes.forEach(n => {
    if (n.className === 'spanStar star_full') {
      amountStars += 1;
    }
  });
  return amountStars;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerText = restaurant.name;
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};
