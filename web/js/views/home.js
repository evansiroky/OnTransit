var Backbone = require('Backbone');

module.exports = function(app) {
  
  var HomeView = Backbone.View.extend({
    el: '#home',

    events: {
      'click #find_vehicles': 'findVehiclesClick'
    },

    findVehiclesClick: function() {
      app.router.navigate('findVehicle/', { trigger: true });
    },

    initialize: function() {
      var menuView = require('./leftNavMenuView.js')(app);
      this.menuView = new menuView({el: '#home .left_nav_panel'});
    }

  });

  return new HomeView();
}