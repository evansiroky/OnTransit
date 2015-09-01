var validator = require('is-my-json-valid'),
  moment = require('moment-timezone'),
  GTFSWorker = require('../lib/gtfsWorker.js'),
  gtfsWorker;

var validateTripStopsJSON = validator({
  type: 'object',
  properties: {
    trip_id: {
      type: 'string'
    },
    trip_date: {
      type: 'string',
      format: 'date'
    },
    lat: {
      type: 'number',
      minimum: -90,
      exclusiveMinimum: true,
      maximum: 90,
      exclusiveMaximum: true
    },
    lon: {
      type: 'number',
      minimum: -180,
      exclusiveMinimum: true,
      maximum: 180,
      exclusiveMaximum: true
    }
  },
  required: ['trip_id', 'trip_date', 'lat', 'lon']
}, {
  verbose: true
});

var calculateTripDelay = function(req, res, db) {

  //calculates crowdsourced trip delay using position from user
  //calls getTripStops after done calculating

  var point = {
    type: 'POINT',
    coordinates: [req.query.lon, req.query.lat],
    crs: { type: 'name', properties: { name: 'EPSG:4326'} }
  },
    pointGeom = db.sequelize.fn('ST_GeomFromGeoJSON', JSON.stringify(point) ),
    pointGeog = "ST_GeomFromGeoJSON('" + JSON.stringify(point) + "')::geography",
    lineGeomAlias = db.sequelize.literal('"shape_gi"."geom"'),
    locatePointFn = db.sequelize.fn('ST_LineLocatePoint', 
      lineGeomAlias,
      pointGeom),
    /*lineFractionAlias = db.sequelize.literal('"shape_gi.line_fraction"'),
    interpolateFn = db.sequelize.fn('ST_LineInterpolatePoint', 
      lineGeomAlias,
      lineFractionAlias),*/
    distanceFn = db.sequelize.fn('ST_Distance', 
      db.sequelize.literal('"shape_gi"."geom"::geography'), 
      db.sequelize.literal(pointGeog));

  db.trip.findOne({
    where: {
      trip_id: req.query.trip_id
    },
    include: [{
        model: db.shape_gis,
        attributes: [
          [locatePointFn, 'line_fraction'],
          //[interpolateFn, 'point_on_line'],
          [distanceFn, 'distance']
        ]
      }, {
        model: db.route,
        include: [db.agency]
      }
    ],
    //logging: console.log
  }).then(function(trip) {
    console.log('trip delay');
    console.log(trip.shape_gi.dataValues);
    if(trip.shape_gi.dataValues.distance > 400) {
      getDelay(req, res, db, 'Submitted point is too far from route to calculate delay.');
    } else {
      // distance to trip is acceptable, calculate approximate deviation

      // calculate current seconds after midnight

      // calculate closest two stop_times with departure_times near current seconds after midnight

      getTripStops(req, res, db, 0, 'Delay has been calculated based on your position.');
    }
  });
}

var getDelay = function(req, res, db, delayMsg) {
  // gets the delay from the db
  db.trip_delay.findOne({
    where: {
      trip_id: req.query.trip_id
    }
  }).then(function(tripDelay) {
    var delay = tripDelay ? (tripDelay.seconds_of_delay ? tripDelay.seconds_of_delay : null) : null;
    if(delayMsg) {
      delayMsg += '  ';
    } else {
      delayMsg = '';
    }
    delayMsg += 'Using last known delay for trip.';
    getTripStops(req, res, db, delay, delayMsg);
  });
}

var getTripStops = function(req, res, db, delay, delayMsg) {

  // gets the trip's stops and applies delay
  // (if delay is crowdsourced, doesn't make extra trip to db)

  db.stop_time.findAll({
    where: {
      trip_id: req.query.trip_id
    },
    include: [{
        model: db.trip,
        include: [{
          model: db.route,
          include: [db.agency]
        }]
      },
      db.stop 
    ],
    order: [
      ['stop_sequence', 'ASC']
    ]
  }).then(function(stopTimes) {
    applyDelay(req, res, stopTimes, delay, delayMsg);
  });

}

var applyDelay = function(req, res, stopTimes, delay, delayMsg) {
  // adds the delay to the stop times

  var tripDate = moment.tz(req.query.trip_date, stopTimes[0].trip.route.agency.agency_timezone),
    stops = [];

  for (var i = 0; i < stopTimes.length; i++) {
    var stop = {
      name: stopTimes[i].stop.stop_name,
      scheduled_departure: moment(tripDate).add(stopTimes[i].departure_time, 'seconds')
    }
    // TODO: calculate times for stops without departure_time
    stops.push(stop);
  };

  res.send({
    success: true,
    stops: stops,
    delay: delay,
    delayMsg: delayMsg
  });
}

var tripStopService = function(app, config) {

  gtfsWorker = GTFSWorker(config.pgWeb);

  app.get('/tripStops', function(req, res) {
    var valid = validateTripStopsJSON(req.query);
    if(!valid) {
      res.send(validateTripStopsJSON.errors);
    } else {
      db = gtfsWorker.getConnection();
      if(config.crowdsourceDelay) {
        calculateTripDelay(req, res, db);
      } else {
        getDelay(req, res, db);
      }
    }
  });
};

module.exports = tripStopService;