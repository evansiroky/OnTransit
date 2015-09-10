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
      //console.log('router home');
      this.changePage('#home');
    },

    findTrips: function() {
      //console.log('router findTrips');
      this.changePage('#find_trips');
      app.views.findTrips.locateNearbyTrips();
    },

    tripDetails: function(compositeTripId) {
      console.log('router tripDetails');
      this.changePage('#trip_details');
      app.views.tripDetails.getTripStops(compositeTripId);
    },

    feedback: function() {
      //console.log('router feedback');
      this.changePage('#feedback');
    },

    changePage: function(el) {
      //console.log('change', el);
      $("body").pagecontainer("change", $(el), { reverse: false, changeHash: false });
    }

  });

  app.router = new Router();
  Backbone.history.start({pushState: true});

}