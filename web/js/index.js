var $ = require('jquery');
$.mobile = require('jquery-mobile');

$(document).on('pageinit', function() {
  $('#jq-version').html($().jquery);
});

//custom button click handler to demonstrate working $.mobile function
$(document).on('click', 'button', function() {
  var link = $(this).attr("data-foo");
  console.log('running $.mobile.changePage("'+link+'")');
  $.mobile.changePage(link);
});