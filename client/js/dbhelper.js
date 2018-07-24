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
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Fetch all restaurants.
   * @returns {Promise<Array<Restaurant>>}
   */
  static async fetchRestaurants() {
    try {
      const restData = await idbKeyval.get('restaurantsData');
      if (restData !== undefined) {
        return restData;
      } else {
        const response = await fetch(DBHelper.DATABASE_URL);
        if (response.status === 200) {
          const data = await response.json();
          await idbKeyval.set('restaurantsData', data);
          return data;
        }
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
      const restaurant = restaurants.find(r => r.id == id);
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
      const restaurants = await DBHelper.fetchRestaurants();
      let results = restaurants;
      if (cuisine != 'all') {
        // filter by cuisine
        results = results.filter(r => r.cuisine_type == cuisine);
      }
      if (neighborhood != 'all') {
        // filter by neighborhood
        results = results.filter(r => r.neighborhood == neighborhood);
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
      const uniqueNeighborhoods = neighborhoods.filter(
        (v, i) => neighborhoods.indexOf(v) == i
      );
      return uniqueNeighborhoods;
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
      const uniqueCuisines = cuisines.filter(
        (v, i) => cuisines.indexOf(v) == i
      );
      return uniqueCuisines;
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
  static mapMarkerForRestaurant(restaurant, map) {
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
}
