var validator = require('is-my-json-valid'),
  moment = require('moment-timezone'),
  GTFSWorker = require('../lib/gtfsWorker.js'),
  gtfsWorker;

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
  //var now = moment(),
  var now = moment(),
    nowDate = now.toDate(),
    db = gtfsWorker.getConnection();

  var point = {
    type: 'POINT',
    coordinates: [req.query.lon, req.query.lat],
    crs: { type: 'name', properties: { name: 'EPSG:4326'} }
  },
    pointGeom = db.sequelize.fn('ST_GeomFromGeoJSON', JSON.stringify(point) ),
    pointGeog = "ST_GeomFromGeoJSON('" + JSON.stringify(point) + "')::geography",
    distanceFn = db.sequelize.fn('ST_Distance', 
      db.sequelize.literal('"shape_gi"."geom"::geography'), 
      db.sequelize.literal(pointGeog)),
    distanceAlias = db.sequelize.literal('"shape_gi.distance"');

  db.daily_trip.findAll({
    where: {
      start_datetime: {
        lte: nowDate
      },
      end_datetime: {
        gte: nowDate
      }
    },
    include: [
      {
        model: db.shape_gis,
        attributes: [[distanceFn, 'distance']],
        where: db.sequelize.fn('ST_DWithin',
          db.sequelize.literal('"shape_gi"."geom"::geography'),
          db.sequelize.literal(pointGeog),
          400)
      }, 
      db.route
    ],
    order: [
      [distanceAlias, 'ASC'],
      [db.route, 'route_short_name', 'ASC'],
      ['start_datetime', 'ASC']
    ]
  }).then(function(trips) {
    res.send({
      success: true,
      trips: trips
    });
  }).catch(function(errors) {
    res.send({
      success: false,
      error: 'Database error finding trips.'
    });
    throw errors;
  }).finally(function() {
    db.close();
  });
  
};

var tripService = function(app, config) {

  gtfsWorker = GTFSWorker(config.pgWeb);

  app.get('/trips', function(req, res) {
    var valid = validateTripJSON(req.query);
    if(!valid) {
      res.send(validateTripJSON.errors);
    } else {
      findTrips(req, res);
    }
  });

};

module.exports = tripService;