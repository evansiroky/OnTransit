var Q = require('q'),
  testConfig = require('./config.js'),
  loader = require('../lib/loader.js');

describe('ontransit-db-download', function() {
  this.timeout(180000);

  it('should download', function() {
    var promise = function() {
      deferred = Q.defer();
      try{
        loader(testConfig.pgWorker, deferred.resolve);
      } catch(err) {
        deferred.reject(err);
      }
      return deferred.promise;
    }

    return promise();
  });

});