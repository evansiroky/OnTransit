var Backbone = require('backbone');

var Trip = Backbone.Model.extend({
  idAttribute: 'trip_composite_id',
  parse: function(data) {
    data.trip_composite_id = data.start_datetime + '_' + data.trip_id;
    return data;
  }
});

module.exports = Trip;