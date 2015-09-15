var validator = require('is-my-json-valid'),
  moment = require('moment-timezone'),
  GTFSWorker = require('../lib/gtfsWorker.js'),
  util = require('../lib/util.js'),
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

  var point = util.makePoint(req.query.lat, req.query.lon),
    pointGeog = util.makePointGeog(point),
    distanceFn = db.sequelize.fn('ST_Distance', 
      db.sequelize.literal('"shape_gi"."geom"::geography'), 
      db.sequelize.literal(pointGeog)),
    distanceAlias = db.sequelize.literal('"shape_gi.distance"');

  db.daily_trip.findAll({
    where: {
      start_datetime: {
        lte: moment(nowDate).add(10, 'minutes').toDate()
      },
      end_datetime: {
        gte: moment(nowDate).subtract(30, 'minutes').toDate()
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
    ],
    //logging: console.log
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