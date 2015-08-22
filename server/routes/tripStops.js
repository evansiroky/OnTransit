var validator = require('is-my-json-valid'),
  config = require('../config'),
  GTFSWorker = require('../lib/gtfsWorker.js');

var gtfsWorker = GTFSWorker('pgWeb');

var validateTripStopsJSON = validator({
  type: 'object',
  properties: {
    trip_id: {
      type: 'string'
    },
    lat: {
      type: 'number',
      minimum: -180,
      exclusiveMinimum: true,
      maximum: 180,
      exclusiveMaximum: true
    },
    lon: {
      type: 'number',
      minimum: -90,
      exclusiveMinimum: true,
      maximum: 90,
      exclusiveMaximum: true
    }
  },
  required: ['trip_id', 'lat', 'lon']
}, {
  verbose: true
});

var calculateTripDelay = function(req, res) {
  // body...
}

var getTripStops = function(req, res) {
  // body...
}

var tripService = function(req, res) {
  var valid = validateTripStopsJSON(req.query);
  if(!valid) {
    res.send(validateTripStopsJSON.errors);
  } else {
    if(config.crowdsourceDelay) {
      calculateTripDelay(req, res);
    } else {
      getTripStops(req, res);
    }
  }
};

module.exports = {
  '/tripStops': tripService
}; 