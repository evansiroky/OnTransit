var Backbone = require('Backbone');

module.exports = function(app) {
  
  var TripDetailsView = Backbone.View.extend({
    el: '#tripDetails'
  });

  return TripDetailsView;
}