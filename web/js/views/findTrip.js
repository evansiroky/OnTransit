var Backbone = require('Backbone');

module.exports = function(app) {
  
  var FindTripView = Backbone.View.extend({
    el: '#trip'
  });

  return FindTripView;
}