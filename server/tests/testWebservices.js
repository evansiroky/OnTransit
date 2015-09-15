var assert = require("assert"),
  Q = require('q'),
  rp = require('request-promise'),
  main = require('../index.js'),
  testConfig = require('./config.js');


describe('ontransit-server', function() {

  it('server should startup', function() {

    this.timeout(20000);

    var promise = function() {
      deferred = Q.defer();
      try{
        main(testConfig, deferred.resolve);
      } catch(err) {
        deferred.reject(err);
      }
      return deferred.promise;
    }

    return promise();

  });

  describe('webservices', function() {

    this.timeout(5000);

    it('index.html', function() {

      return rp('http://localhost:80/').then(function(data) {
        assert(data.indexOf('src="main.js"') > -1);
        assert(data.indexOf('href="main.css"') > -1);
      });

    });

    it('trips', function() {

      return rp({
        uri: 'http://localhost:80/trips',
        qs: {
          lat: 42.3244775,
          lon: -122.870815
        }
      }).then(function(data) {
        var jdata = JSON.parse(data);
        console.log(jdata);
        assert(jdata.success);
        assert(jdata.trips.length > 0);
      });

    });

    it('tripStops', function() {

      return rp({
        uri: 'http://localhost:80/tripStops',
        qs: {
          accuracy: 10,
          trip_id: 'b8efcaab-fdf5-4f27-988d-58d811a0397d',
          trip_start_datetime: '2015-09-12T12:34:56Z',
          lat: 42.3244775,
          lon: -122.870815
        }
      }).then(function(data) {
        var jdata = JSON.parse(data);
        console.log(jdata);
        assert(jdata.success);
        assert(jdata.stops.length > 0);
      });

    });

  });

});