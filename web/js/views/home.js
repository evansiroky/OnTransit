var Backbone = require('Backbone');

module.exports = function(app) {
  
  var HomeView = Backbone.View.extend({
    el: '#home',

    events: {
      "click #find_vehicles": "findVehiclesClick"
    },

    findVehiclesClick: function() {
      console.log('findVehiclesClick');
      app.router.navigate('findVehicle/', { trigger: true });
    },

    render: function() {

    }

  });

  return new HomeView();
}