var Backbone = require('Backbone');

module.exports = function(app) {
  
  var FeedbackView = Backbone.View.extend({
    el: '#feedback'
  });

  return new FeedbackView();
}