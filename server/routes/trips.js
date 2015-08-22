var validator = require('is-my-json-valid'),
  moment = require('moment-timezone'),
  GTFSWorker = require('../lib/gtfsWorker.js');

var gtfsWorker = GTFSWorker('pgWeb');

var validateTripJSON = validator({
  type: 'object',
  properties: {
    lon: {
      type: 'number',
      minimum: -180,
      exclusiveMinimum: true,
      maximum: 180,
      exclusiveMaximum: true
    },
    lat: {
      type: 'number',
      minimum: -90,
      exclusiveMinimum: true,
      maximum: 90,
      exclusiveMaximum: true
    }
  },
  required: ['lat', 'lon']
}, {
  verbose: true
});

var findTrips = function(req, res) {
  // find all trips close to a given lat/lon at the current datetime
  var now = moment(),
    nowDate = now.toDate(),
    db = gtfsWorker.getConnection();

  var point = {
    type: 'POINT',
    coordinates: [req.query.lon, req.query.lat],
    crs: { type: 'name', properties: { name: 'EPSG:4326'} }
  },
    pointGeom = 'ST_GeomFromGeoJSON(' + JSON.stringify(point) + ')',
    distanceFn = 'ST_DISTANCE(geom, ' + pointGeom + ')';

  db.daily_trip.findAll({
    where: {
      start_datetime: {
        lte: nowDate
      },
      end_datetime: {
        gte: nowDate
      }
    },
    includes: [
      {
        model: db.shape_gis,
        attributes: [db.Sequelize.literal(distanceFn), 'distance'],
        where: {
          distance: {
            lte: 400
          }
        }
      }, 
      db.route
    ],
    order: [
      //['distance', 'ASC'],
      //['route_short_name', 'ASC'],
      ['start_datetime', 'ASC']
    ],
    logging: console.log
  }).then(function(trips) {
    db.close();
    res.send({
      success: true,
      trips: trips
    });
  });
};

var tripService = function(req, res) {
  var valid = validateTripJSON(req.query);
  if(!valid) {
    res.send(validateTripJSON.errors);
  } else {
    findTrips(req, res);
  }
};

module.exports = {
  '/trips': tripService
}; 