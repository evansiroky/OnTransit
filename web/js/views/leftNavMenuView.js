var Backbone = require('Backbone');

module.exports = function(app) {

  var menuView = Backbone.View.extend({

    events: {
      'click .left_nav_home': 'homeClick',
      'click .left_nav_find_trips': 'findTripsClick',
      'click .left_nav_feedback': 'feedbackClick'
    },

    homeClick: function() {
      //console.log('homeClick');
      app.router.navigate('', { trigger: true });
    },

    findTripsClick: function() {
      //console.log('findVehiclesClick');
      app.router.navigate('findTrips/', { trigger: true });
    },

    feedbackClick: function() {
      //console.log('feedbackClick');
      app.router.navigate('feedback/', { trigger: true });
    }

  });

  return menuView;

}