var $ = require('jquery');
$.mobile = require('jquery-mobile');

var firstLoad = true;

$(document).on("pageinit", function () {

  if(firstLoad) {
    $.mobile.ajaxEnabled = false;
    $.mobile.linkBindingEnabled = false;
    $.mobile.hashListeningEnabled = false;
    $.mobile.pushStateEnabled = false;
    //$.mobile.autoInitializePage = false;

    var app = {};

    require('./router.js')(app);
    require('./views')(app);
    require('./models')(app);

    firstLoad = false;
  }

});