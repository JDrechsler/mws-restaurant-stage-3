/**
 * Common database helper functions.
 */
class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}`;
  }

  /**
   * Fetch all restaurants.
   * @returns {Promise<Array<Restaurant>>}
   */
  static async fetchRestaurants() {
    try {
      const restData = await idbKeyval.get('restaurantsData');
      if (restData === undefined) {
        const response = await fetch(`${DBHelper.DATABASE_URL}/restaurants`);
        if (response.status === 200) {
          const data = await response.json();
          await idbKeyval.set('restaurantsData', data);
          return data;
        }
      } else {
        return restData;
      }
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Fetch a restaurant by its ID.
   * @param {number} id
   */
  static async fetchRestaurantById(id) {
    try {
      const restaurants = await DBHelper.fetchRestaurants();
      const restaurant = restaurants.find(r => r.id === id);
      if (restaurant) {
        // Got the restaurant
        return restaurant;
      } else {
        // Restaurant does not exist in the database
        return 'Restaurant does not exist';
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   * @param {string} cuisine
   * @param {string} neighborhood
   */
  static async fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    try {
      let results = await DBHelper.fetchRestaurants();
      if (cuisine !== 'all') {
        // filter by cuisine
        results = results.filter(r => r.cuisine_type === cuisine);
      }
      if (neighborhood !== 'all') {
        // filter by neighborhood
        results = results.filter(r => r.neighborhood === neighborhood);
      }
      return results;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   * @returns {Array<string>}
   */
  static async fetchNeighborhoods() {
    try {
      const restaurants = await DBHelper.fetchRestaurants();

      // Get all neighborhoods from all restaurants
      const neighborhoods = restaurants.map(
        (v, i) => restaurants[i].neighborhood
      );
      // Remove duplicates from neighborhoods
      return neighborhoods.filter((v, i) => neighborhoods.indexOf(v) === i);
    } catch (error) {
      return error;
    }
  }

  /**
   * Fetch all cuisines with proper error handling.
   * @returns {Promise<Array<string>>}
   */
  static async fetchCuisines() {
    try {
      // Fetch all restaurants
      const restaurants = await DBHelper.fetchRestaurants();
      // Get all cuisines from all restaurants
      const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
      // Remove duplicates from cuisines
      return cuisines.filter((v, i) => cuisines.indexOf(v) === i);
    } catch (error) {
      return error;
    }
  }

  /**
   * Restaurant page URL.
   * @param {Restaurant} restaurant
   */
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URL.
   * @param {Restaurant} restaurant
   */
  static imageUrlForRestaurant(restaurant) {
    return `./img/${restaurant.photograph}`;
  }

  /**
   * Restaurant image alt text
   * @param {Restaurant} restaurant
   */
  static imageAltForRestaurant(restaurant) {
    return restaurant.imgAlt;
  }

  /**
   * Map marker for a restaurant.
   * @param {Restaurant} restaurant
   */
  static mapMarkerForRestaurant(restaurant) {
    const marker = new L.marker(
      [restaurant.latlng.lat, restaurant.latlng.lng],
      {
        title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      }
    );
    marker.addTo(newMap);
    return marker;
  }

  /**
   * Fetch all reviews.
   * @returns {Promise<Array<Review>>}
   */
  static async fetchReviews() {
    try {
      const reviewsData = await idbKeyval.get('reviewsData');
      if (reviewsData === undefined) {
        const response = await fetch(`${DBHelper.DATABASE_URL}/reviews`);
        if (response.status === 200) {
          const data = await response.json();
          await idbKeyval.set('reviewsData', data);
          return data;
        }
      } else {
        return reviewsData;
      }
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Fetches reviews by given id
   * @param id {number}
   * @returns {Promise<Array<Review>>}
   */
  static async fetchReviewsById(id) {
    const reviews = await DBHelper.fetchReviews();
    return reviews.filter(r => r.restaurant_id === id);
  }

  /**
   * Mark restaurant as favorite
   * @param restaurant {Restaurant}
   * @returns {Promise<void>}
   */
  static async markRestaurantAsFavorite(restaurant) {
    await fetch(`${DBHelper.DATABASE_URL}/restaurants/${restaurant.id}/`, {
      method: 'POST',
      body: JSON.stringify({
        is_favorite: true
      })
    });
  }

  /**
   * Unmark restaurant as favorite
   * @param restaurant {Restaurant}
   * @returns {Promise<void>}
   */
  static async unmarkRestaurantAsFavorite(restaurant) {
    try {
      await fetch(`${DBHelper.DATABASE_URL}/restaurants/${restaurant.id}/`, {
        method: 'POST',
        body: JSON.stringify({
          is_favorite: false
        })
      });
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Updates the stored restaurants in idb
   * @param restaurants {Array<Restaurant>}
   * @returns {Promise<void>}
   */
  static async updateRestaurantsIDB(restaurants) {
    await idbKeyval.set('restaurantsData', restaurants);
  }

  /**
   * Updates the reviews entries in idb
   * @param review {Review}
   * @returns {Promise<void>}
   */
  static async updateReviewsIDB(review) {
    const currentStateReviewsIDB = await idbKeyval.get('reviewsData');
    if (currentStateReviewsIDB === undefined) {
      console.log('reviewsData was not found in idb');
    } else {
      const lastEntry =
        currentStateReviewsIDB[currentStateReviewsIDB.length - 1];
      review.id = lastEntry.id + 1;
      let newStateReviewsIDB = [...currentStateReviewsIDB, review];
      await idbKeyval.set('reviewsData', newStateReviewsIDB);
      navigator.serviceWorker.ready.then(swReg => {
        return swReg.sync.register('syncReviews');
      });
    }
  }
}
