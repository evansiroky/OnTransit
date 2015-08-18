var validator = require('is-my-json-valid');

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

var tripService = function(req, res) {
  var valid = validateTripStopsJSON(req.query);
  if(!valid) {
    res.send(validateTripStopsJSON.errors);
  } else {
    res.send(req.query);
  }
};

module.exports = {
  '/tripStops': tripService
}; 