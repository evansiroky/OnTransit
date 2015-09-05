var Backbone = require('Backbone');

module.exports = function(app) {
  
  var FindVehicleView = Backbone.View.extend({
    el: '#find_vehicle',

    initialize: function() {
      var menuView = require('./leftNavMenuView.js')(app);
      this.menuView = new menuView({el: '#find_vehicle .left_nav_panel'});
      console.log(this.menuView);
    }

  });

  return new FindVehicleView();
}