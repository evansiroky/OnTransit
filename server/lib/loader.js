var async = require('async'),
  dbStreamer = require('db-streamer'),
  gtfsSequelizeUtil = require('gtfs-sequelize/lib/util.js'),
  moment = require('moment-timezone'),
  GTFSWorker = require('./gtfsWorker.js');

module.exports = function(dbconfig, loaderCallback) {

  gtfsWorker = GTFSWorker(dbconfig);

  var db = gtfsWorker.getConnection();

  // prepare copy attributes
  var stopTimeAttrs = Object.keys(db.stop_time.attributes),
    tripAttrs = Object.keys(db.trip.attributes),
    days;

  delete stopTimeAttrs.departure_time;
  delete stopTimeAttrs.arrival_time;
  delete stopTimeAttrs.createdAt;
  delete stopTimeAttrs.updatedAt;

  delete tripAttrs.createdAt;
  delete tripAttrs.createdAt;

  var dailyTripInserter, dailyStopTimeInserter, serviceQueue;

  var createAppModels = function(callback) {
    console.log('creating app models');
    db.block_delay.sync({ force: true }).then(function() {
      db.daily_trip.sync({ force: true }).then(function() {
        db.daily_stop_time.sync({ force: true }).then(function() {
          db.sequelize.query('DROP SEQUENCE IF EXISTS daily_trip_id_seq;' +
            'CREATE SEQUENCE daily_trip_id_seq;' +
            'GRANT USAGE ON SEQUENCE daily_trip_id_seq TO ' + dbconfig.workerUserName + ';').then(function() {
            callback();
          });
        });
      });
    });
  };

  var insertDailyStopTime = function(curTripDate, stopTime) {
    stopTime.arrival_datetime = moment(curTripDate).add(stopTime.arrivalSeconds, 'seconds').toDate();
    stopTime.departure_datetime = moment(curTripDate).add(stopTime.departureSeconds, 'seconds').toDate();
    delete stopTime.arrivalSeconds;
    delete stopTime.departureSeconds;
    dailyStopTimeInserter.push(stopTime);
  };

  var prepareStopTimes = function(curTripDate, dailyTripId, stopTimes) {
    // calculate items for dailyStopTime
    var stopsWithoutTiming = [],
      lastStopWithTiming,
      i, j;

    for (i = 0; i < stopTimes.length; i++) {
      var dailyStopTime = {
        daily_trip_id: dailyTripId,
        departureSeconds: stopTimes[i].departure_time,
        arrivalSeconds: stopTimes[i].arrival_time,
        lineFraction: stopTimes[i].dataValues.line_fraction
      };

      for (j = 0; j < stopTimeAttrs.length; j++) {
        dailyStopTime[stopTimeAttrs[j]] = stopTimes[i][stopTimeAttrs[j]];
      };        

      if(!dailyStopTime.departureSeconds) {
        dailyStopTime.departureSeconds = dailyStopTime.arrivalSeconds;
      }

      if(!dailyStopTime.arrivalSeconds) {
        dailyStopTime.arrivalSeconds = dailyStopTime.departureSeconds;
      }

      if(!dailyStopTime.departureSeconds) {
        stopsWithoutTiming.push(dailyStopTime);
      } else {
        if(stopsWithoutTiming.length > 0) {
          // calculate difference between the known schedule
          var fractionOfTravel = dailyStopTime.lineFraction - lastStopWithTiming.lineFraction,
            secondsOfTravel = dailyStopTime.arrivalSeconds - lastStopWithTiming.departureSeconds;
          for (j = 0; j < stopsWithoutTiming.length; j++) {
            var travelFromLastStopWithTiming = stopsWithoutTiming[j].lineFraction - lastStopWithTiming.lineFraction,
              pctOfTravel = travelFromLastStopWithTiming / fractionOfTravel,
              stopSeconds = Math.round(pctOfTravel * secondsOfTravel + lastStopWithTiming.departureSeconds);
            stopsWithoutTiming[j].departureSeconds = stopSeconds;
            stopsWithoutTiming[j].arrivalSeconds = stopSeconds;
            insertDailyStopTime(curTripDate, stopsWithoutTiming[j]);
          };
          stopsWithoutTiming = [];
        }
        insertDailyStopTime(curTripDate, dailyStopTime);
        lastStopWithTiming = dailyStopTime;
      }
    };
  };

  var calculateDailyTripsAndStopTimesForServiceId = function (calendarDate, serviceDefCallback) {
    // calculates begin and end datetimes for trips belonging to valid service ids

    // iterate through each day to determine if any days active
    var validServices = [];

    for (var i = 0; i < days.length; i++) {
      var dayValid = false,
        curDay = days[i],
        dayOfWeek = curDay.format('dddd').toLowerCase();

      // check regular calendar
      if(calendarDate[dayOfWeek]) {
        dayValid = true;
      }

      // ensure day is within service range
      if(moment(calendarDate.start_date).isAfter(curDay) ||
         moment(calendarDate.end_date).isBefore(curDay)) {
        dayValid = false;
      }

      // check for any exceptions
      if(calendarDate.calendar_dates.length > 0) {
        for (var j = 0; j < calendarDate.calendar_dates.length; j++) { 
          var exceptionDate = moment(calendarDate.calendar_dates[0].date);
          if(days[i].isSame(exceptionDate, 'day')) {
            if(calendarDate.calendar_dates[j].exception_type === 2) {
              dayValid = false;
            } else if(calendarDate.calendar_dates[j].exception_type === 1) {
              dayValid = true;
            }
          }
        }
      }

      if(dayValid) {
        validServices.push({ 
          service_id: calendarDate.service_id, 
          date: days[i]
        });
      }
    };

    var validServiceQueue = async.queue(function(validService, serviceCallback) {
      // calculate all trips for specified date and service id  
      db.trip.findAll({
        where: {
          service_id: validService.service_id
        },
        include: [{
            model: db.route,
            include: [db.agency]
          }
        ]
      }).then(function(trips) {
        if(trips.length > 0) {
          var tripDate = validService.date.format('YYYY-MM-DD');

          console.log('adding trips and stop times for service_id `' + validService.service_id + '` on ' + tripDate);
          
          var tripQueue = async.queue(function(curTrip, tripCallback) {

            var copyTrip = {},
              curTripDate = moment.tz(tripDate, curTrip.route.agency.agency_timezone);

            for (var i = 0; i < tripAttrs.length; i++) {
              copyTrip[tripAttrs[i]] = curTrip[tripAttrs[i]];
            };

            // find first and last stop times
            db.stop_time.findAll({
              where: {
                trip_id: curTrip.trip_id
              },
              include: [
                {
                  model: db.trip,
                  include: [
                    {
                      model: db.shape_gis,
                      attributes: [
                        [db.sequelize.fn('ST_LineLocatePoint',
                           db.sequelize.literal('"trip.shape_gi"."geom"'),
                           db.sequelize.literal('"stop"."geom"')),
                         'line_fraction']
                      ]
                    }
                  ]
                }, 
                db.stop
              ],
              order: [
                ['stop_sequence', 'ASC']
              ],
              //logging: console.log
            }).then(function(stopTimes) {

              // calculate start and end of daily trip
              copyTrip.daily_block_id = tripDate + (copyTrip.block_id ? copyTrip.block_id : copyTrip.trip_id);
              copyTrip.start_datetime = moment(curTripDate).add(stopTimes[0].departure_time, 'seconds').toDate();
              copyTrip.end_datetime = moment(curTripDate).add(stopTimes[stopTimes.length - 1].arrival_time, 'seconds').toDate();

              // get next sequence value for daily_trip_id
              db.sequelize.query("SELECT nextval('daily_trip_id_seq')", {
                type: db.sequelize.QueryTypes.SELECT
              }).then(function(result) {

                //console.log(copyTrip.trip_id);

                var dailyTripId = parseInt(result[0].nextval, 10);

                copyTrip.daily_trip_id = dailyTripId;
                dailyTripInserter.push(copyTrip);

                prepareStopTimes(curTripDate, dailyTripId, stopTimes);                  

                tripCallback();

              });

            });
          });

          for (var i = 0; i < trips.length; i++) {
            tripQueue.push(trips[i]);
          };

          var tripProgressInterval = setInterval(function() {
            console.log(tripQueue.length() + ' remaining trips.  ' + 
              validServiceQueue.length() + ' remaining valid services.  ' +
              serviceQueue.length() + ' remaing services.');
          }, 10000);

          tripQueue.drain = function() {
            clearInterval(tripProgressInterval);
            console.log('done with trips for day-service_id');
            serviceCallback();
          }

        } else {
          serviceCallback();
        }
      });
    });
    
    if(validServices.length > 0) {
      for (var i = 0; i < validServices.length; i++) {
        validServiceQueue.push(validServices[i]);
      };

      validServiceQueue.drain = function() {
        console.log('done with days for service id');
        serviceDefCallback();
      }
    } else {
      serviceDefCallback();
    }

  };

  var calculateDailyTripsAndStopTimes = function(callback) {
    // calculates begin and end datetimes for all trips plus or minus 72 hours from now
    console.log('calculating daily trips');

    // dates
    var today = moment();
    today.set('hour', 0);
    today.set('minute', 0);
    today.set('second', 0);
    today.set('millisecond', 0);

    var yesterday = moment(today).subtract(1, 'days'),
      tomorrow = moment(today).add(1, 'days'),
      yesterdayDate = yesterday.toDate(),
      tomorrowDate = tomorrow.toDate();
    
    days = [yesterday, today, tomorrow];

    // find valid service ids plus or minus 1 day from now
    db.calendar.findAll({
      where: {
        start_date: {
          lte: tomorrowDate
        },
        end_date: {
          gte: yesterdayDate
        }
      },
      include: [{
        model: db.calendar_date,
        where: {
          date: {
            gte: yesterdayDate,
            lte: tomorrowDate
          }
        },
        required: false
      }]
    }).then(function(calendarDates) {

      var dailyTripInserterConfig = gtfsSequelizeUtil.makeInserterConfig(db.daily_trip);
      dailyTripInserterConfig.deferUntilEnd = true;

      dailyTripInserter = dbStreamer.getInserter(dailyTripInserterConfig);

      var dailyStopTimeInserterConfig = gtfsSequelizeUtil.makeInserterConfig(db.daily_stop_time);

      dailyStopTimeInserterConfig.deferUntilEnd = true;

      dailyStopTimeInserter = dbStreamer.getInserter(dailyStopTimeInserterConfig);

      // iterate through each service definition
      serviceQueue = async.queue(calculateDailyTripsAndStopTimesForServiceId);

      serviceQueue.pause();

      for (var i = 0; i < calendarDates.length; i++) {
        serviceQueue.push(calendarDates[i]);
      };

      serviceQueue.drain = function() {
        console.log('loading all daily trips and stop_times');
        dailyTripInserter.setEndHandler(function() {
          console.log('done inserting daily trips');
          dailyStopTimeInserter.setEndHandler(callback);
          dailyStopTimeInserter.end();
        });
        dailyTripInserter.end();
      }

      serviceQueue.resume();

    });

  };

  var grantWebUserPermissions = function(seriesCallback) {

    console.log('granting permissions to web user');

    var tables = ['agency',
      'calendar',
      'calendar_date',
      'fare_attribute',
      'fare_rule',
      'feed_info',
      'frequency',
      'route',
      'shape',
      'shape_gis',
      'stop',
      'stop_time',
      'transfer',
      'trip',
      'daily_trip',
      'daily_stop_time',
      'block_delay'];

    var grantWorker = async.queue(function(table, queueCallback) {
      db.sequelize.query('GRANT SELECT ON TABLE ' + table + ' TO GROUP "' + dbconfig.webUsername + '"').then(function() {
        queueCallback();
      }).catch(function(err) {
        console.log(err.message);
        queueCallback();
      });
    });

    for (var i = 0; i < tables.length; i++) {
      grantWorker.push(tables[i]);
    };
    grantWorker.drain = function() {
      db.sequelize.query('GRANT SELECT, INSERT, UPDATE ON TABLE block_delay TO GROUP "' + dbconfig.webUsername + '"').then(function() {
        seriesCallback();
      });
    }
  }

  async.series([
      function(cb) {
        gtfsWorker.downloadGtfs(cb)
      },
      function(cb) {
        gtfsWorker.loadGtfs(cb);
      },
      createAppModels,
      calculateDailyTripsAndStopTimes,
      grantWebUserPermissions
    ],
    function(err, results) {
      if(err) {
        throw err;
      } else {
        console.log('database is loaded');
        if(loaderCallback) {
          loaderCallback();
        }
      }
    });
}