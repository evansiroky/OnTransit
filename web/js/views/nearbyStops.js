var $ = require('jquery'),
  _ = require('underscore'),
  Backbone = require('backbone'),
  moment = require('moment-timezone'),
  Mustache = require('mustache'),
  config = require('../config.js'),
  util = require('../util.js');

var timeFmt = 'h:mma',
  nearbyStopListItemTemplate = $('#nearbyStopListItemTemplate').html();
Mustache.parse(nearbyStopListItemTemplate);

var stopTimeModel = Backbone.Model.extend(),
  StopTimeCollection = Backbone.Collection.extend({
    model: stopTimeModel
  }),
  stopTimeCollection = new StopTimeCollection;

module.exports = function(app) {
  
  var NearbyStopsView = Backbone.View.extend({

    el: '#nearby_stops',

    events: {
      'click #nearby_stops_locate_button': 'locateNearbyStops',
      'click .nearby_stop_list_item': 'stopListItemClick',
      'click #nearby_stops_yes_on_vehicle_button': 'onTransit',
      'click #nearby_stops_not_on_vehicle_button': 'notOnTransit'
    },

    locateNearbyStops: function() {
      
      // change ui state
      $('#nearby_stops_progress').html('Locating stops...');
      $('#nearby_stops_locate_button').hide();
      $('#nearby_stop_list').empty();

      stopTimeCollection.reset();

      // get position
      util.getLocation(_.bind(this.geolocationSuccess, this), _.bind(this.geolocationError, this));

    },

    geolocationError: function(err) {
      this.popupError(err);
    },

    geolocationSuccess: function(position) {

      // update feedback mailto with position
      util.reverseGeocode(app, position, function(addr) {
        var mailTo = util.makeMailTo({}, position, addr);
        $('#feedback_agency_button').attr('href', mailTo);
        app.views.feedback.mailToWithPosition = true;
      });

      app.collections.nearbyStops.fetch({
        success: _.bind(this.renderStops, this),
        error: _.bind(this.getStopsError, this),
        data: {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
      });
    },

    getStopsError: function(collection, response, options) {
      this.popupError('Server-side error finding trips.  ' +
        'Please try again.  ' +
        'If you continue to have problems, please submit app feedback.');
    },

    initialize: function() {
      var menuView = require('./leftNavMenuView.js')(app);
      this.menuView = new menuView({el: '#nearby_stops .left_nav_panel'});
    },

    notOnTransit: function() {
      $("#nearby_stops_confirm_onboard").popup('close');
    },

    onTransit: function() {
      $("#nearby_stops_confirm_onboard").popup('close');
      var curStopIdx = parseInt(this.curStopTarget.attr('id').replace('stop_list_item_', ''), 10),
        curStop = stopTimeCollection.at(curStopIdx);
      console.log(curStop);
      app.curDailyTripId = curStop.get('daily_trip_id');
      app.curDailyBlockId = curStop.get('daily_block_id');
      app.curTripId = curStop.get('trip_id');
      app.router.navigate('tripDetails/', { trigger: true });
    },

    popupError: function(msg) {
      $('#nearby_stops_error_message').html(msg);
      $("#nearby_stops_problem").popup("open");

      $('#nearby_stops_progress').html(msg);
      $('#nearby_stops_locate_button').show();
      $('#nearby_stop_list').html('Error finding trips');
    },

    renderStops: function(collection, response, options) {
      
      $('#nearby_stops_locate_button').show();

      if(collection.length == 0) {
        $('#nearby_stops_progress').html('No stops found.  ' +
          'There may not be any stops nearby, or there may not be any active trips.  ' +
          'Please try again later.');
        return;
      }

      $('#nearby_stops_progress').html(collection.length + ' stops found.');

      var curIdx = 0,
        stopListHTML = '';

      collection.each(function(stop, idx) {
        stopListHTML += '<li data-role="list-divider" class="nearby_stop_title">' + stop.get('stop_name') + '</li>';
        
        var stopTimes = stop.get('stop_times');

        for (var i = 0; i < stopTimes.length; i++) {
          var curStopTime = stopTimes[i],
            scheduledDeparture = moment.tz(curStopTime.scheduled, config.agencyTZ).format(timeFmt),
            actualDeparture = moment.tz(curStopTime.actual, config.agencyTZ).format(timeFmt);

          if(typeof curStopTime.delay == 'number') {
            actualDeparture += '✓';
          } else {
            actualDeparture += '??';
          }
          
          stopTimeCollection.add([curStopTime]);

          stopListHTML += Mustache.render(nearbyStopListItemTemplate, {
            idx: curIdx,
            headsign: curStopTime.trip_headsign,
            scheduledTime: scheduledDeparture,
            actualTime: actualDeparture
          });

          curIdx += 1;
        };
      }, this);

      $('#nearby_stop_list').html(stopListHTML);
      $('#nearby_stop_list').listview('refresh');
    },

    stopListItemClick: function(e) {
      this.curStopTarget = $(e.currentTarget);
      $("#nearby_stops_confirm_onboard").popup("open");
    }

  });

  return new NearbyStopsView();
}