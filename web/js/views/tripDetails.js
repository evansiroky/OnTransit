var $ = require('jquery'),
  _ = require('underscore'),
  Backbone = require('Backbone'),
  moment = require('moment'),
  Mustache = require('Mustache'),
  util = require('../util.js');

var tripStopListItemTemplate = $('#tripStopListItemTemplate').html();
Mustache.parse(tripStopListItemTemplate);

module.exports = function(app) {
  
  var TripDetailsView = Backbone.View.extend({
    el: '#trip_details',

    events: {
      'click #trip_details_footer_refresh': 'refreshData',
      'click #trip_details_footer_feedback': 'sendFeedback',
      'click #trip_details_feedback_agency_button': 'sendAgencyFeedback',
      'click #trip_details_feedback_app_button': 'sendAppFeedback'
    },

    getTripStops: function(compositeTripId) {
      var tripStartDatetime = compositeTripId.split('_')[0],
        tripId = compositeTripId.split('_')[1];

      if(tripStartDatetime && tripId) {
        this.tripStartDatetime = tripStartDatetime;
        this.tripId = tripId;
      }

      // get position
      util.getLocation(_.bind(this.geolocationSuccess, this), _.bind(this.geolocationError, this));

    },

    refreshData: function() {
      util.getLocation(_.bind(this.geolocationSuccess, this), _.bind(this.geolocationError, this));
    },

    geolocationError: function(err) {
      this.popupError(err);
    },

    geolocationSuccess: function(position) {
      app.collections.stops.fetch({
        success: _.bind(this.renderTripStops, this),
        error: _.bind(this.getTripStopsError, this),
        data: {
          accuracy: position.coords.accuracy,
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          trip_id: this.tripId,
          trip_start_datetime: this.tripStartDatetime
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

      console.log(collection, response, options);
      
      // $('#find_trips_locate_button').show();

      var tripStopListHTML = '',
        pastUser = false,
        timeFmt = 'h:mma',
        tripBeginTime = moment(this.tripStartDatetime),
        tripBeginSeconds = collection.at(0).get('departureSeconds');

      if(collection.at(0).get('pastUser') === false) {
        tripStopListHTML += '<li data-role="list-divider">Past Stops</li>';
      }

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
    },

    sendAppFeedback: function() {

    },

    sendFeedback: function() {
      $("#trip_details_feedback").popup("open");
    }

  });

  return new TripDetailsView();
}