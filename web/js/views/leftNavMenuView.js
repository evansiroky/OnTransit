var Backbone = require('backbone');

module.exports = function(app) {

  var menuView = Backbone.View.extend({

    events: {
      'click .left_nav_home': 'homeClick',
      'click .left_nav_nearby_stops': 'nearbyStopsClick',
      'click .left_nav_find_trips': 'findTripsClick',
      'click .left_nav_feedback': 'feedbackClick',
      'click .left_nav_about': 'aboutClick'
    },

    homeClick: function() {
      //console.log('homeClick');
      app.router.navigate('', { trigger: true });
    },

    nearbyStopsClick: function() {
      //console.log('homeClick');
      app.router.navigate('nearbyStops/', { trigger: true });
    },

    findTripsClick: function() {
      //console.log('findVehiclesClick');
      app.router.navigate('findTrips/', { trigger: true });
    },

    feedbackClick: function() {
      //console.log('feedbackClick');
      app.router.navigate('feedback/', { trigger: true });
    },

    aboutClick: function() {
      //console.log('aboutClick');
      app.router.navigate('about/', { trigger: true });
    }

  });

  return menuView;

}