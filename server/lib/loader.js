var async = require('async'),
  moment = require('moment-timezone'),
  GTFSWorker = require('./gtfsWorker.js');

module.exports = function(dbconfig, loaderCallback) {

  gtfsWorker = GTFSWorker(dbconfig);

  var db = gtfsWorker.getConnection();

  var createAppModels = function(callback) {
    console.log('creating app models');
    db.daily_trip.sync({ force: true }).then(function() {
      db.trip_delay.sync({ force: true }).then(function() {
        callback();
      });
    });
  };

  var calculateDailyTrips = function(callback) {
    // calculates begin and end datetimes for all trips plus or minus 72 hours from now
    console.log('calculating daily trips');

    // dates
    var today = moment();
    today.set('hour', 0);
    today.set('minute', 0);
    today.set('second', 0);

    var yesterday = moment(today).subtract(1, 'days'),
      tomorrow = moment(today).add(1, 'days'),
      yesterdayDate = yesterday.toDate(),
      tomorrowDate = tomorrow.toDate(),
      days = [yesterday, today, tomorrow];

    var tripInserter = async.cargo(function(dailyTrips, inserterCallback) {
        //console.log(dailyTrips[0]);
        db.daily_trip.bulkCreate(dailyTrips).then(function() {
          inserterCallback();
        });
      },
      1000
    );

    var calculateDailyTripsForServiceId = function (calendarDate, serviceDefCallback) {
      // calculates begin and end datetimes for trips belonging to valid service ids

      // iterate through each day to determine if any days active
      var validServices = [];

      for (var i = 0; i < days.length; i++) {
        var dayValid = false,
          dayOfWeek = days[i].format('dddd').toLowerCase();

        // check regular calendar
        if(calendarDate[dayOfWeek]) {
          dayValid = true;
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

      async.each(validServices,
        function(validService, serviceCallback) {
          // calculate all trips for specified date and service id  
          db.trip.findAll({
            where: {
              service_id: validService.service_id
            },
            include: [db.stop_time,
              {
                model: db.route,
                include: [db.agency]
              }
            ]
          }).then(function(trips) {
            if(trips.length > 0) {
              var tripAttrs = Object.keys(db.trip.attributes),
                tripDate = validService.date.format('YYYY-MM-DD');
              console.log('adding trips for service_id `' + validService.service_id + '` on ' + tripDate);
              delete tripAttrs.createdAt;
              delete tripAttrs.updatedAt;
              for (var k = 0; k < trips.length; k++) {
                var curTrip = trips[k],
                  copyTrip = {},
                  curTripDate = moment.tz(tripDate, curTrip.route.agency.agency_timezone);
                for (var i = 0; i < tripAttrs.length; i++) {
                  copyTrip[tripAttrs[i]] = curTrip[tripAttrs[i]];
                };
                copyTrip.start_datetime = moment(curTripDate).add(curTrip.stop_times[0].departure_time, 'seconds').toDate();
                copyTrip.end_datetime = moment(curTripDate).add(curTrip.stop_times[curTrip.stop_times.length - 1].arrival_time, 'seconds').toDate();
                tripInserter.push(copyTrip);
              };
            }
            serviceCallback();
          });
        },
        serviceDefCallback
      );
    };

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

      // iterate through each service definition
      async.each(calendarDates, 
        calculateDailyTripsForServiceId, 
        function(err) {
          if(err) {
            callback(err);
          } else {
            tripInserter.drain = callback;
          }
        }
      );

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
      'trip_delay'];

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
      db.sequelize.query('GRANT SELECT, INSERT, UPDATE ON TABLE trip_delay TO GROUP "' + dbconfig.webUsername + '"').then(function() {
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
      calculateDailyTrips,
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