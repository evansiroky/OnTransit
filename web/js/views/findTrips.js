var $ = require('jquery'),
  _ = require('underscore'),
  Backbone = require('Backbone'),
  moment = require('moment'),
  Mustache = require('Mustache'),
  util = require('../util.js');

var tripListItemTemplate = $('#tripListItemTemplate').html();
Mustache.parse(tripListItemTemplate);

module.exports = function(app) {
  
  var FindTripsView = Backbone.View.extend({
    el: '#find_trips',

    events: {
      'click #find_trips_locate_button': 'locateNearbyTrips',
      'click .trip_list_item': 'tripListItemClick',
      'click #find_trips_yes_on_vehicle_button': 'onTransit',
      'click #find_trips_not_on_vehicle_button': 'notOnTransit'
    },

    locateNearbyTrips: function() {
      // change ui state
      $('#find_trips_progress').html('Locating trips...');
      $('#find_trips_locate_button').hide();
      $('#find_trip_list').empty();

      // get position
      util.getLocation(_.bind(this.geolocationSuccess, this), _.bind(this.geolocationError, this));

    },

    geolocationError: function(err) {
      this.popupError(err);
    },

    geolocationSuccess: function(position) {
      app.collections.trips.fetch({
        success: _.bind(this.renderTrips, this),
        error: _.bind(this.getTripsError, this),
        data: {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
      });
    },

    getTripsError: function(collection, response, options) {
      this.popupError('Server-side error finding trips.  ' +
        'Please try again.  ' +
        'If you continue to have problems, please submit app feedback.');
    },

    initialize: function() {
      var menuView = require('./leftNavMenuView.js')(app);
      this.menuView = new menuView({el: '#find_trips .left_nav_panel'});
    },

    notOnTransit: function() {
      $("#find_trips_confirm_onboard").popup('close');
    },

    onTransit: function() {
      $("#find_trips_confirm_onboard").popup('close');
      app.router.navigate('tripDetails/' + 
        this.curTripTarget.attr('id').replace('trip_list_item_', ''), 
        { trigger: true });
    },

    popupError: function(msg) {
      $('#find_trips_error_message').html(msg);
      $("#find_trips_problem").popup("open");

      $('#find_trips_progress').html(msg);
      $('#find_trips_locate_button').show();
      $('#find_trip_list').html('Error finding trips');
    },

    renderTrips: function(collection, response, options) {
      if(collection.length == 0) {
        $('#find_trips_progress').html('No trips found.  ' +
          'There may not be any trips nearby, or there may not be any active trips.  ' +
          'Please try again.');
      }

      $('#find_trips_progress').html('');
      $('#find_trips_locate_button').show();

      var tripList = [];

      collection.each(function(trip) {
        var timeFmt = 'h:mma',
          tripStart = moment(trip.get('start_datetime')).format(timeFmt),
          tripEnd = moment(trip.get('end_datetime')).format(timeFmt),
          route = trip.get('route');
        tripList.push({
          distance: Math.round(trip.get('shape_gi').distance * 3.28084),
          id: trip.get('trip_composite_id'),
          timing: 'Start: ' + tripStart + '  End: ' + tripEnd,
          title: route.route_short_name + ' - ' + route.route_long_name + ' - ' + trip.get('trip_headsign')
        })
      }, this);

      $('#find_trip_list').html(Mustache.render(tripListItemTemplate, {trips: tripList}));
      $('#find_trip_list').listview('refresh');
    },

    tripListItemClick: function(e) {
      this.curTripTarget = $(e.currentTarget);
      $("#find_trips_confirm_onboard").popup("open");
    }

  });

  return new FindTripsView();
}