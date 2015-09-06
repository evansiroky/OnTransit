var $ = require('jquery'),
  Backbone = require('Backbone');

module.exports = function(app) {

  var Router = Backbone.Router.extend({

    routes: {
      "": "home",
      "findTrips/": "findTrips",
      "tripDetails/:trip_id": "tripDetails",
      "feedback/": "feedback"
    },

    home: function() {
      console.log('router home');
      this.changePage('#home');
    },

    findTrips: function() {
      console.log('router findTrips');
      this.changePage('#find_trips');
      app.views.findTrips.locateNearbyTrips();
    },

    tripDetails: function(tripId) {
      console.log('router tripDetails');
      this.changePage('#find_vehicle');
      app.views.tripDetails.getTripStops();
    },

    feedback: function() {
      console.log('router feedback');
      this.changePage('#find_vehicle');
    },

    changePage: function(el) {
      $("body").pagecontainer("change", $(el), { reverse: false, changeHash: false });
    }

  });

  app.router = new Router();
  Backbone.history.start({pushState: true});

}