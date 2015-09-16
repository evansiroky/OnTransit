var $ = require('jquery'),
  _ = require('underscore'),
  Backbone = require('backbone'),
  moment = require('moment-timezone'),
  Mustache = require('mustache'),
  config = require('../config.js'),
  util = require('../util.js');

var tripStopListItemTemplate = $('#tripStopListItemTemplate').html();
Mustache.parse(tripStopListItemTemplate);

module.exports = function(app) {
  
  var TripDetailsView = Backbone.View.extend({
    el: '#trip_details',

    events: {
      'click #trip_details_footer_refresh': 'getTripStops',
      'click #trip_details_footer_feedback': 'sendFeedback',
      'click #trip_details_feedback_agency_button': 'sendAgencyFeedback',
      'click #trip_details_feedback_app_button': 'sendAppFeedback'
    },

    formatDelay: function(delay) {
      // prettify seconds of delay into human readable format

      if(delay === 0) {
        return 'Vehicle is on time.';
      }

      if(delay === null) {
        return 'Vehicle status unknown.';
      }

      var s = Math.abs(delay),
        sec = s % 60,
        m = ((s - sec) / 60) % 60,
        h = (s - (m * 60) - sec) / 3600,
        out = 'Vehicle is ';

      if(h > 0) {
        out += h + 'h ';
      }

      if(m > 0) {
        out += m + 'm ';
      }

      if(sec > 0) {
        out += sec + 's ';
      }

      return out + (delay > 0 ? 'late' : 'early') + '.';
    },

    getTripStops: function() {
      util.getLocation(_.bind(this.geolocationSuccess, this), _.bind(this.geolocationError, this));
    },

    geolocationError: function(err) {
      this.popupError(err);
    },

    geolocationSuccess: function(position) {

      //after getting position, update feedback mailTo
      var mailToOptions = {};
      mailToOptions['Trip ID'] = app.curTripId;

      util.reverseGeocode(app, position, function(addr) {
        var mailTo = util.makeMailTo(mailToOptions, position, addr);
        $('#trip_details_feedback_agency_button').attr('href', mailTo);
        $('#feedback_agency_button').attr('href', mailTo);
        app.views.feedback.mailToWithPosition = true;
      });
      
      // fetch trip stops & calculate delay
      app.collections.tripStops.fetch({
        success: _.bind(this.renderTripStops, this),
        error: _.bind(this.getTripStopsError, this),
        data: {
          accuracy: position.coords.accuracy,
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          daily_trip_id: app.curDailyTripId,
          daily_block_id: app.curDailyBlockId
        }
      });
    },

    getTripStopsError: function(collection, response, options) {
      this.popupError('Server-side error finding trip stops.  ' +
        'Please try again.  ' +
        'If you continue to have problems, please submit app feedback.');
    },

    initialize: function() {
      var menuView = require('./leftNavMenuView.js')(app);
      this.menuView = new menuView({el: '#trip_details .left_nav_panel'});
    },

    popupError: function(msg) {
      $('#trip_details_error_message').html(msg);
      $("#trip_details_problem").popup("open");

      $('#trip_details_stop_list').html('Error finding trip stops');
    },

    renderTripStops: function(collection, response, options) {

      //console.log(collection, response, options);
      
      var tripStopListHTML = '',
        pastUser = false,
        timeFmt = 'h:mma',
        tripBeginTime = moment(response.trip_start_datetime),
        tripBeginSeconds = collection.at(0).get('departureSeconds');

      if(collection.at(0).get('pastUser') === false) {
        tripStopListHTML += '<li data-role="list-divider">Past Stops</li>';
      }

      $('#trip_details_delay').html(this.formatDelay(response.delay));
      $('#trip_details_delay_details').html(response.delayMsg);

      collection.each(function(stop) {

        if(!pastUser && (stop.get('pastUser') === true)) {
          tripStopListHTML += '<li id="trip_details_upcoming_divider" data-role="list-divider">Upcoming Stops</li>';
          pastUser = true;
        }

        var stopCfg = {
          trip_stop_relativity_class: pastUser ? 'trip_stop_upcoming' : 'trip_stop_past',
          stopName: stop.get('name')
        }

        var stopSecondsField = pastUser ? 'arrivalSeconds' : 'departureSeconds',
          stopSeconds = stop.get(stopSecondsField),
          stopTime = moment(tripBeginTime);

        stopTime.add(stopSeconds - tripBeginSeconds, 'seconds');
        stopCfg.scheduledTime = stopTime.format(timeFmt);

        if(response.delay) {
          stopTime.add(response.delay, 'seconds');
          stopCfg.actualTime = stopTime.format(timeFmt);
        } else {
          stopCfg.actualTime = '?' + stopCfg.scheduledTime + '?';
        }
        
        tripStopListHTML += Mustache.render(tripStopListItemTemplate, stopCfg);
      }, this);

      $('#trip_details_stop_list').html(tripStopListHTML);
      $('#trip_details_stop_list').listview('refresh');

      $(document.body).animate({
          'scrollTop': $('#trip_details_upcoming_divider').offset().top
      }, 500);
    },

    sendAgencyFeedback: function() {
      
      analytics('send', {
        hitType: 'event',          // Required.
        eventCategory: 'Trip Details View',   // Required.
        eventAction: 'Send Agency Feedback',      // Required.
        eventLabel: 'Trip Details View: Send Agency Feedback Button'
      });

    },

    sendAppFeedback: function() {
      util.sendAppFeedback('Trip Details View', 
        'Send App Feedback', 
        'Trip Details View: Send App Feedback Button');
    },

    sendFeedback: function() {
      $("#trip_details_feedback").popup("open");
    }

  });

  return new TripDetailsView();
}