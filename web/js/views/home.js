var Backbone = require('Backbone');

module.exports = function(app) {
  
  var HomeView = Backbone.View.extend({
    el: '#home',

    events: {
      'click #home_find_trips_button': 'findTripsClick'
    },

    findTripsClick: function() {
      app.router.navigate('findTrips/', { trigger: true });
    },

    initialize: function() {
      var menuView = require('./leftNavMenuView.js')(app);
      this.menuView = new menuView({el: '#home .left_nav_panel'});
    }

  });

  return new HomeView();
}