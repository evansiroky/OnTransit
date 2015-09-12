var Backbone = require('backbone');

module.exports = function(app) {
  
  app.models = {};
  app.models.trip = require('./trip.js');
  app.models.stop = require('./stop.js');

  var TripCollection = Backbone.Collection.extend({
    model: app.models.trip,
    parse: function(response, options) {
      return response.trips;
    },
    url: function() {
      return '/trips';
    }
  });

  var StopCollection = Backbone.Collection.extend({
    model: app.models.stop,
    parse: function(response, options) {
      return response.stops;
    },
    url: function() {
      return '/tripStops';
    }
  });

  app.collections = {};
  app.collections.trips = new TripCollection();
  app.collections.stops = new StopCollection();

}