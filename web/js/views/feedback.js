var Backbone = require('backbone'),
  util = require('../util.js');

module.exports = function(app) {
  
  var FeedbackView = Backbone.View.extend({
    el: '#feedback',

    events: {
      'click #feedback_agency_button': 'agencyFeedback',
      'click #feedback_app_button': 'appFeedback',
    },

    agencyFeedback: function() {
      analytics('send', {
        hitType: 'event',          // Required.
        eventCategory: 'Feedback View',   // Required.
        eventAction: 'Send Agency Feedback',      // Required.
        eventLabel: 'Feedback View: Send Agency Feedback Button'
      });
    },

    appFeedback: function() {
      util.sendAppFeedback('Feedback View', 
        'Send App Feedback', 
        'Feedback View: Send App Feedback Button');
    },

    initialize: function() {
      var menuView = require('./leftNavMenuView.js')(app);
      this.menuView = new menuView({el: '#feedback .left_nav_panel'});
      this.mailToWithPosition = false;
    },

    refreshAgencyFeedbackMailto: function(mailToOptions) {
      if(!this.mailToWithPosition) {
        util.updateMailToTarget(app, '#feedback_agency_button');
      }
    }

  });

  return new FeedbackView();
}