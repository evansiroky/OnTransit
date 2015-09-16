var util = {};

util.sendGenericError = function(res) {
  res.send({
    success: false,
    error: 'An error occured.  If this error persists, please submit feedback at OnTransit.userecho.com'
  });
}

util.makePoint = function(lat, lon) {
  return {
    type: 'POINT',
    coordinates: [lon, lat],
    crs: { type: 'name', properties: { name: 'EPSG:4326'} }
  }
}

util.makePointGeom = function(sequelize, point) {
  return sequelize.fn('ST_GeomFromGeoJSON', JSON.stringify(point) );
}

util.makeLiteralPointGeom = function(point) {
  return "ST_GeomFromGeoJSON('" + JSON.stringify(point) + "')";
}

util.makePointGeog = function(point) {
  return "ST_GeomFromGeoJSON('" + JSON.stringify(point) + "')::geography";
}

module.exports = util;