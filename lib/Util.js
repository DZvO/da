function getDistanceFromLatLonInKm(a, b) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(b.lat - a.lat); // deg2rad below
  const dLon = deg2rad(b.lon - a.lon);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(deg2rad(a.lat)) * Math.cos(deg2rad(b.lat))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Math.abs(d);
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}