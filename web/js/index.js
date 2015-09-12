var $ = require('jquery'),
  analytics = require('ga-browser')(),
  config = require('./config.js');

$.mobile = require('jquery-mobile');

var app = {},
  firstLoad = true;

// make a global func for xss callback
window.initGMaps = function() {
  app.geocoder = new google.maps.Geocoder();
}

$(function() {

  // init google maps for geocoding
  if(!config.geocoderApiKey) {
    $.getScript('https://maps.googleapis.com/maps/api/js?sensor=false&callback=initGMaps');
  } else {
    $.getScript('https://maps.googleapis.com/maps/api/js?key=' + config.geocoderApiKey + '&callback=initGMaps');
  }  

});

$(window).on("popstate", function(e) {
  // prevent jQuery mobile from hijacking back event?
  e.preventDefault();
});

$(document).on("pageinit", function (event, ui) {

  if(firstLoad) {

    $.mobile.ajaxEnabled = false;
    $.mobile.linkBindingEnabled = false;
    $.mobile.hashListeningEnabled = false;
    $.mobile.pushStateEnabled = false;
    //$.mobile.autoInitializePage = false;

    require('./views')(app);
    require('./models')(app);
    require('./router.js')(app);

    // create GA tracking
    analytics('create', config.gaTrackingId, 'auto'); 

    firstLoad = false;
  }

});