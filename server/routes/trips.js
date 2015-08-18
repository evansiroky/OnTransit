var validator = require('is-my-json-valid');

var validateTripJSON = validator({
  type: 'object',
  properties: {
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
  required: ['lat', 'lon']
}, {
  verbose: true
});

var tripService = function(req, res) {
  var valid = validateTripJSON(req.query);
  if(!valid) {
    res.send(validateTripJSON.errors);
  } else {
    res.send(req.query);
  }
};

module.exports = {
  '/trips': tripService
}; 