var Backbone = require('Backbone');

module.exports = function(app) {
  
  var TripDetailsView = Backbone.View.extend({
    el: '#trip_details',

    getTripStops: function() {

    },

    initialize: function() {
      var menuView = require('./leftNavMenuView.js')(app);
      this.menuView = new menuView({el: '#trip_details .left_nav_panel'});
    }

  });

  return new TripDetailsView();
}