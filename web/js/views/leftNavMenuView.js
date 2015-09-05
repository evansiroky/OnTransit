var Backbone = require('Backbone');

module.exports = function(app) {

  var menuView = Backbone.View.extend({

    events: {
      'click .left_nav_home': 'homeClick',
      'click .left_nav_find_vehicles': 'findVehiclesClick',
      'click .left_nav_feedback': 'feedbackClick'
    },

    homeClick: function() {
      //console.log('homeClick');
      app.router.navigate('', { trigger: true });
    },

    findVehiclesClick: function() {
      //console.log('findVehiclesClick');
      app.router.navigate('findVehicle/', { trigger: true });
    },

    feedbackClick: function() {
      //console.log('feedbackClick');
      app.router.navigate('feedback/', { trigger: true });
    }

  });

  return menuView;

}