var Backbone = require('Backbone');

module.exports = function(app) {
  
  app.models = {};
  app.models.trip = require('./trip.js');
  app.models.stop = require('./stop.js');

  app.collections = {};
  app.collections.trips = Backbone.Collection.extend({
    model: app.models.trip,
    url: 'trips'
  });
  
  app.collections.stops = Backbone.Collection.extend({
    model: app.models.stop,
    url: 'tripStops'
  });

}