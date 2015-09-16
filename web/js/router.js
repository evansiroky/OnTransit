var $ = require('jquery'),
  Backbone = require('backbone');

module.exports = function(app) {

  var Router = Backbone.Router.extend({

    initialize: function() {
      Backbone.history.start({pushState: true});
    },

    routes: {
      "": "home",
      "nearbyStops/": "nearbyStops",
      "findTrips/": "findTrips",
      "tripDetails/": "tripDetails",
      "feedback/": "feedback"
    },

    home: function() {
      // console.log('router home');
      this.changePage('#home');
    },

    nearbyStops: function() {
      console.log('router nearbyStops');
      this.changePage('#nearby_stops');
      app.views.nearbyStops.locateNearbyStops();
    },

    findTrips: function() {
      // console.log('router findTrips');
      this.changePage('#find_trips');
      app.views.findTrips.locateNearbyTrips();
    },

    tripDetails: function() {
      // console.log('router tripDetails');
      if(app.curDailyTripId) {
        this.changePage('#trip_details');
        app.views.tripDetails.getTripStops();
      } else {
        this.navigate('', { trigger: true });
      }
    },

    feedback: function() {
      // console.log('router feedback');
      this.changePage('#feedback');
    },

    changePage: function(el) {
      // console.log('change', el);
      $(":mobile-pagecontainer").pagecontainer("change", el, { changeHash: false });
    }

  });

  app.router = new Router();

}