var moment = require('moment-timezone'),
  PriorityQueue = require('js-priority-queue'),
  validator = require('is-my-json-valid'),
  GTFSWorker = require('../lib/gtfsWorker.js'),
  util = require('../lib/util.js'),
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

  var point = util.makePoint(req.query.lat, req.query.lon),
    pointGeom = util.makePointGeom(db.sequelize, point),
    pointGeog = util.makePointGeog(point),
    lineGeomAlias = db.sequelize.literal('"shape_gi"."geom"'),
    locatePointFn = db.sequelize.fn('ST_LineLocatePoint', 
      lineGeomAlias,
      pointGeom),
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
    
    if(trip.shape_gi.dataValues.distance > 400) {
      getDelay(req, res, db, 'Submitted point is too far from route to calculate delay.');
    } else {
      // distance to trip is acceptable, calculate approximate deviation

      db.stop_time.findAll({
        attributes: [
          'departure_time',
          'arrival_time',
          [db.sequelize.fn('ST_LineLocatePoint',
              db.sequelize.literal('"trip.shape_gi"."geom"'),
              db.sequelize.literal('"stop"."geom"')),
            'line_fraction']
        ],
        where: {
          trip_id: req.query.trip_id
        },
        include: [{
            model: db.trip,
            include: [{
                model: db.route,
                include: [db.agency]
              }, 
              db.shape_gis,
            ]
          },
          db.stop 
        ],
        order: [
          ['stop_sequence', 'ASC']
        ],
        //logging: console.log
      }).then(function(stopTimes) {

        // calculate current seconds after midnight
        var userLineFraction = trip.shape_gi.dataValues.line_fraction,
          tripTz = stopTimes[0].trip.route.agency.agency_timezone,
          tripDate = moment.tz(req.query.trip_date, tripTz),
          now = moment().tz(tripTz),
          nowSeconds = now.hours() * 3600 + now.minutes() * 60 + now.seconds();

        if(now.diff(tripDate, 'days') > 0) {
          nowSeconds += 86400;
        }

        // find closest 2 stop_times to userPosition

        // create priority queue to sort stop proximities
        var stopPriorityQueue = new PriorityQueue({
          comparator: function(a, b) {
            return a.fractionDeviation - b.fractionDeviation;
          }
        });

        // push stops with known departure times into priority queue
        for (var i = 0; i < stopTimes.length; i++) {
          var stop = stopTimes[i];
          if(!stop.departure_time) {
            stop.departure_time = stop.arrival_time;
          }

          if(!stop.arrival_time) {
            stop.arrival_time = stop.departure_time;
          }

          if(stop.departure_time) {

            stop.fractionDeviation = Math.abs(userLineFraction - stop.dataValues.line_fraction);

            stopPriorityQueue.queue(stop);

          }

        }

        // grab two closest stops
        var closestStop = stopPriorityQueue.dequeue(),
          nextClosestStop = stopPriorityQueue.dequeue(),
          previousStop, nextStop;

        // sort the two based on sequence
        if(closestStop.dataValues.line_fraction > nextClosestStop.dataValues.line_fraction) {
          previousStop = nextClosestStop;
          nextStop = closestStop;
        } else {
          previousStop = closestStop;
          nextStop = nextClosestStop;
        }

        // ensure line fraction is not out of the range of found stops
        userLineFraction = Math.min(nextStop.dataValues.line_fraction, userLineFraction);
        userLineFraction = Math.max(previousStop.dataValues.line_fraction, userLineFraction);

        // delay calculation
        var fractionOfTravel = nextStop.dataValues.line_fraction - previousStop.dataValues.line_fraction,
          secondsOfTravel = nextStop.arrival_time - previousStop.departure_time,
          travelFromPreviousStop = userLineFraction - previousStop.dataValues.line_fraction,
          pctOfTravel = travelFromPreviousStop / fractionOfTravel,
          pointSeconds = Math.round(pctOfTravel * secondsOfTravel + previousStop.departure_time),
          delay = nowSeconds - pointSeconds;

        // insert delay in DB
        db.trip_delay.upsert({
          trip_id: req.query.trip_id,
          seconds_of_delay: delay
        }).then(function() {
          applyDelay(req, res, userLineFraction, 
            stopTimes, delay, 'Delay has been calculated based on your position.');
        });
      });
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

    var point = util.makePoint(req.query.lat, req.query.lon),
      pointGeom = util.makePointGeom(db.sequelize, point),
      lineGeomAlias = db.sequelize.literal('"shape_gi"."geom"'),
      locatePointFn = db.sequelize.fn('ST_LineLocatePoint', 
        lineGeomAlias,
        pointGeom)

    // calculate line fraction
    db.trip.findOne({
      where: {
        trip_id: req.query.trip_id
      },
      include: [{
        model: db.shape_gis,
        attributes: [
          [locatePointFn, 'line_fraction']
        ]
      }]
    }).then(function(trip) {
      getTripStops(req, res, db, trip.shape_gi.dataValues.line_fraction, delay, delayMsg);
    })
  });
}

var getTripStops = function(req, res, db, userLocationLineFraction, delay, delayMsg) {

  // gets the trip's stops and applies delay
  // (if delay is crowdsourced, doesn't make extra trip to db)

  db.stop_time.findAll({
    attributes: [
      'departure_time',
      'arrival_time',
      [db.sequelize.fn('ST_LineLocatePoint',
          db.sequelize.literal('"trip.shape_gi"."geom"'),
          db.sequelize.literal('"stop"."geom"')),
        'line_fraction']
    ],
    where: {
      trip_id: req.query.trip_id
    },
    include: [{
        model: db.trip,
        include: [{
            model: db.route,
            include: [db.agency]
          }, 
          db.shape_gis,
        ]
      },
      db.stop 
    ],
    order: [
      ['stop_sequence', 'ASC']
    ],
    //logging: console.log
  }).then(function(stopTimes) {
    applyDelay(req, res, userLocationLineFraction, stopTimes, delay, delayMsg);
  });

}

var applyDelay = function(req, res, userLocationLineFraction, stopTimes, delay, delayMsg) {
  // adds the delay to the stop times

  var tripDate = moment.tz(req.query.trip_date, stopTimes[0].trip.route.agency.agency_timezone),
    stops = [],
    stopsWithoutTiming = [],
    lastStopWithTiming;

  for (var i = 0; i < stopTimes.length; i++) {
    var stop = {
      name: stopTimes[i].stop.stop_name,
      departureSeconds: stopTimes[i].departure_time,
      arrivalSeconds: stopTimes[i].arrival_time,
      pastUser: stopTimes[i].dataValues.line_fraction > userLocationLineFraction,
      lineFraction: stopTimes[i].dataValues.line_fraction
    }

    if(!stop.departureSeconds) {
      stop.departureSeconds = stop.arrivalSeconds;
    }

    if(!stop.arrivalSeconds) {
      stop.arrivalSeconds = stop.departureSeconds;
    }

    if((!stop.pastUser && !stopTimes[i].departure_time) || 
       (stop.pastUser && !stopTimes[i].arrival_time)) {
      stopsWithoutTiming.push(stop);
    } else {
      if(stopsWithoutTiming.length > 0) {
        // calculate difference between the known schedule
        var fractionOfTravel = stop.lineFraction - lastStopWithTiming.lineFraction,
          secondsOfTravel = stop.arrivalSeconds - lastStopWithTiming.departureSeconds;
        for (var j = 0; j < stopsWithoutTiming.length; j++) {
          var travelFromLastStopWithTiming = stopsWithoutTiming[j].lineFraction - lastStopWithTiming.lineFraction,
            pctOfTravel = travelFromLastStopWithTiming / fractionOfTravel,
            stopSeconds = Math.round(pctOfTravel * secondsOfTravel + lastStopWithTiming.departureSeconds);
          stopsWithoutTiming[j].departureSeconds = stopSeconds;
          stopsWithoutTiming[j].arrivalSeconds = stopSeconds;
          stops.push(stopsWithoutTiming[j]);
        };
        stopsWithoutTiming = [];
      }
      stops.push(stop);
      lastStopWithTiming = stop;
    }
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