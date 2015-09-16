var Backbone = require('backbone');

module.exports = function(app) {
  
  var AboutView = Backbone.View.extend({
    el: '#about',

    initialize: function() {
      var menuView = require('./leftNavMenuView.js')(app);
      this.menuView = new menuView({el: '#about .left_nav_panel'});
    }

  });

  return new AboutView();
}