var async = require('async'),
  validator = require('is-my-json-valid'),
  moment = require('moment-timezone'),
  GTFSWorker = require('../lib/gtfsWorker.js'),
  util = require('../lib/util.js'),
  config, gtfsWorker;

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

var findStops = function(req, res) {
  // find all trips close to a given lat/lon at the current datetime
  //var now = moment(),
  var now = moment(),
    nowDate = now.toDate(),
    db = gtfsWorker.getConnection();

  var point = util.makePoint(req.query.lat, req.query.lon),
    pointGeog = util.makePointGeog(point),
    distanceFn = db.sequelize.fn('ST_Distance', 
      db.sequelize.literal('"stop"."geom"::geography'), 
      db.sequelize.literal(pointGeog)),
      distanceAlias = db.sequelize.literal('"distance"');

  db.stop.findAll({
    attributes: ['stop_name',
      [distanceFn, 'distance']
    ],
    where: db.sequelize.fn('ST_DWithin',
      db.sequelize.literal('"stop"."geom"::geography'),
      db.sequelize.literal(pointGeog),
      1200
    ),
    include: [
      {
        model: db.daily_stop_time,
        include: [
          {
            model: db.daily_trip,
            where: {
              start_datetime: {
                lte: moment(nowDate).add(config.tripStartPadding, 'minutes').toDate()
              },
              end_datetime: {
                gte: moment(nowDate).subtract(config.tripEndPadding, 'minutes').toDate()
              }
            },
            include: [
              {
                model: db.block_delay,
                required: false
              }
            ]
          }
        ]
      }
    ],
    order: [
      [distanceAlias, 'ASC'],
      [db.daily_stop_time, 'departure_datetime', 'ASC']
    ]
  }).then(function(stops) {
    var stopsOut = [],
      headsigns = [];

    if(stops.length == 0) {
      res.send({
        success: false,
        error: 'No nearby stops with active arrivals.  Please try again later.'
      });
    } else {
      async.each(stops,
        function(stop, itemCallback) {
          var stopHeadsigns = [],
            stopData = {
              stop_name: stop.stop_name,
              stop_times: []
            };
          
          for (var i = 0; i < stop.daily_stop_times.length; i++) {
            var curStopTime = stop.daily_stop_times[i],
              curTrip = curStopTime.daily_trip,
              delay = curTrip.block_delay ? curTrip.block_delay.seconds_of_delay : null,
              scheduledTripDepartureTime = moment(curStopTime.departure_datetime),
              actualTripDepartureTime = moment(curStopTime.departure_datetime);

            if(delay) {
              actualTripDepartureTime.add(delay, 'seconds');
            }

            // verify that curTrip's stop time is within time range
            var stopTimeDiff = actualTripDepartureTime.diff(now, 'minutes');
            if(stopTimeDiff > -config.nearbyStopPastPadding && 
                stopTimeDiff < config.nearbyStopFuturePadding) {

              if(stopHeadsigns.indexOf(curTrip.trip_headsign) == -1) {
                stopHeadsigns.push(curTrip.trip_headsign);
              }

              stopData.stop_times.push({
                scheduled: scheduledTripDepartureTime,
                actual: actualTripDepartureTime,
                delay: delay,
                daily_trip_id: curTrip.daily_trip_id,
                daily_block_id: curTrip.daily_block_id,
                trip_id: curTrip.trip_id,
                trip_headsign: curTrip.trip_headsign
              });

            };
          };

          var headsignCombo = stopHeadsigns.join();

          if(headsigns.indexOf(headsignCombo) == -1 && stopData.stop_times.length > 0) {
            stopsOut.push(stopData);
            headsigns.push(headsignCombo);
          }

          itemCallback();
        },
        function(err) {
          if(!err) {
            res.send({
              success: true,
              stops: stopsOut
            });
          } else {
            res.send({
              success: false,
              error: err
            });
          }
        });
    }
  });

}

var nearbyStopsService = function(app, _config) {

  config = _config;
  gtfsWorker = GTFSWorker(config.pgWeb);

  app.get('/ws/nearbyStops', function(req, res) {
    var valid = validateTripJSON(req.query);
    if(!valid) {
      res.send(validateTripJSON.errors);
    } else {
      findStops(req, res);
    }
  });

};

module.exports = nearbyStopsService;