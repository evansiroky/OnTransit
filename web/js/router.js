var $ = require('jquery'),
  analytics = require('ga-browser')(),
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
      "feedback/": "feedback",
      "about/": "about"
    },

    home: function() {
      // console.log('router home');
      analytics('send', 'pageview', {
        page: '/',
        title: 'Home'
      });
      this.changePage('#home');
    },

    nearbyStops: function() {
      // console.log('router nearbyStops');
      analytics('send', 'pageview', {
        page: '/nearbyStops',
        title: 'Nearby Stops'
      });
      this.changePage('#nearby_stops');
      app.views.nearbyStops.locateNearbyStops();
    },

    findTrips: function() {
      // console.log('router findTrips');
      analytics('send', 'pageview', {
        page: '/findTrips',
        title: 'Find Trips'
      });
      this.changePage('#find_trips');
      app.views.findTrips.locateNearbyTrips();
    },

    tripDetails: function() {
      // console.log('router tripDetails');
      if(app.curDailyTripId) {
        analytics('send', 'pageview', {
          page: '/tripDetails',
          title: 'Trip Details'
        });
        this.changePage('#trip_details');
        app.views.tripDetails.getTripStops();
      } else {
        this.navigate('', { trigger: true });
      }
    },

    feedback: function() {
      // console.log('router feedback');
      analytics('send', 'pageview', {
        page: '/feedback',
        title: 'Feedback'
      });
      this.changePage('#feedback');
      app.views.feedback.refreshAgencyFeedbackMailto();
    },

    about: function() {
      // console.log('router feedback');
      analytics('send', 'pageview', {
        page: '/about',
        title: 'About'
      });
      this.changePage('#about');
    },

    changePage: function(el) {
      // console.log('change', el);
      $(":mobile-pagecontainer").pagecontainer("change", el, { changeHash: false });
    }

  });

  app.router = new Router();

}