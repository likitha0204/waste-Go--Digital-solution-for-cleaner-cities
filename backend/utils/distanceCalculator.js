/**
 * Calculates the distance between two coordinates using the Haversine formula.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in Kilometers
 */
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
      ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
  }
  
  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }
  
  /**
   * Estimates travel time based on distance and average speed.
   * Assumes urban traffic speed of ~30 km/h.
   * @param {number} distanceKm 
   * @returns {number} Estimated minutes (rounded)
   */
  function estimateTravelTime(distanceKm) {
      const averageSpeedKmH = 30; // 30 km/h average city speed
      const timeHours = distanceKm / averageSpeedKmH;
      const timeMinutes = Math.ceil(timeHours * 60);
      // Add a buffer of 5 minutes for traffic/parking
      return timeMinutes + 5; 
  }
  
  module.exports = { getDistanceFromLatLonInKm, estimateTravelTime };
