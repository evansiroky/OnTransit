var fs = require('fs'),
  express = require('express'),
  queryType = require('query-types'),
  app = express();

// check if this file was invoked direct through command line or required as an export
var invocation = (require.main === module) ? 'direct' : 'required';

var main = function(config, callback) {
  app.use('/', express.static('../web/dist'));
  app.use(queryType.middleware())

  require('./routes')(app, config);

  var server = app.listen(1234, function () {
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