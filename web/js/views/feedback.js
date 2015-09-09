var Backbone = require('Backbone');

module.exports = function(app) {
  
  var FeedbackView = Backbone.View.extend({
    el: '#feedback',

    events: {
      'click #feedback_agency_button': 'agencyFeedback',
      'click #feedback_app_button': 'appFeedback',
    },

    agencyFeedback: function() {

    },

    appFeedback: function() {

    },

    initialize: function() {
      var menuView = require('./leftNavMenuView.js')(app);
      this.menuView = new menuView({el: '#feedback .left_nav_panel'});
    }

  });

  return new FeedbackView();
}