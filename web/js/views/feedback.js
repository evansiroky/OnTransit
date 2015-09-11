var Backbone = require('Backbone'),
  util = require('../util.js');

module.exports = function(app) {
  
  var FeedbackView = Backbone.View.extend({
    el: '#feedback',

    events: {
      'click #feedback_agency_button': 'agencyFeedback',
      'click #feedback_app_button': 'appFeedback',
    },

    agencyFeedback: function() {
      util.sendAgencyFeedback(app,
        'Feedback View', 
        'Send Agency Feedback', 
        'Feedback View: Send Agency Feedback Button');
    },

    appFeedback: function() {
      util.sendAppFeedback('Feedback View', 
        'Send App Feedback', 
        'Feedback View: Send App Feedback Button');
    },

    initialize: function() {
      var menuView = require('./leftNavMenuView.js')(app);
      this.menuView = new menuView({el: '#feedback .left_nav_panel'});
    }

  });

  return new FeedbackView();
}