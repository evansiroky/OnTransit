var express = require('express'),
  queryType = require('query-types'),
  routescan = require('express-routescan'),
  app = express();

app.use('/', express.static('../web/dist'));
app.use(queryType.middleware())

routescan(app);

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});