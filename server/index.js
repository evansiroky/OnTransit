var fs = require('fs'),
  express = require('express'),
  queryType = require('query-types'),
  app = express();

// check if this file was invoked direct through command line or required as an export
var invocation = (require.main === module) ? 'direct' : 'required',
  backboneRoutes = ['/', '/nearbyStops', '/findTrips', '/tripDetails', '/feedback'];

var main = function(config, callback) {
  
  var staticFiles = express.static('../web/dist');
  
  for (var i = 0; i < backboneRoutes.length; i++) {
    app.use(backboneRoutes[i], staticFiles);
  };
  
  app.use(queryType.middleware())

  require('./routes')(app, config);

  var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);

    if(callback) {
      callback();
    }

  });

}

// Allow script to be called directly from commandline or required (for testable code)
if(invocation === 'direct') {
  main(require('./config'));
} else {
  module.exports = main;
}