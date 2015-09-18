var Backbone = require('backbone');

var parse = function(items) {
  return items ? items : [];
}

module.exports = function(app) {
  
  app.models = {};
  app.models.nearbyStop = require('./nearbyStop.js');
  app.models.trip = require('./trip.js');
  app.models.tripStop = require('./tripStop.js');

  var NearbyStopCollection = Backbone.Collection.extend({
    model: app.models.nearbyStop,
    parse: function(response, options) {
      return parse(response.stops);
    },
    url: function() {
      return '/ws/nearbyStops';
    }
  });

  var TripCollection = Backbone.Collection.extend({
    model: app.models.trip,
    parse: function(response, options) {
      return parse(response.trips);
    },
    url: function() {
      return '/ws/trips';
    }
  });

  var TripStopCollection = Backbone.Collection.extend({
    model: app.models.tripStop,
    parse: function(response, options) {
      return parse(response.stops);
    },
    url: function() {
      return '/ws/tripStops';
    }
  });

  app.collections = {};
  app.collections.nearbyStops = new NearbyStopCollection();
  app.collections.trips = new TripCollection();
  app.collections.tripStops = new TripStopCollection();

}