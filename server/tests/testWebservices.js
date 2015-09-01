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

  describe('server http requests', function() {

    this.timeout(5000);

    it('main page', function() {

      return rp('http://localhost:1234/').then(function(data) {
        assert(data.indexOf('src="main.js"') > -1);
        assert(data.indexOf('href="main.css"') > -1);
      });

    });

    it('trip webservice', function() {

      return rp({
        uri: 'http://localhost:1234/trips',
        qs: {
          lat: 42.3244775,
          lon: -122.870815
        }
      }).then(function(data) {
        var jdata = JSON.parse(data);
        assert(jdata.trips.length > 0);
      });

    });

    it('tripStops webservice', function() {

      return rp({
        uri: 'http://localhost:1234/tripStops',
        qs: {
          trip_id: 'b8efcaab-fdf5-4f27-988d-58d811a0397d',
          trip_date: '2015-08-31',
          lat: 42.3244775,
          lon: -122.870815
        }
      }).then(function(data) {
        var jdata = JSON.parse(data);
        assert(jdata.trips.length > 0);
      });

    });

  })

});