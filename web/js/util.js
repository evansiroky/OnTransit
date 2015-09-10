var util = {};

util.getLocation = function(successCallback, errorCallback) {

  var geolocationError = function(err) {
    switch (err.code) {
      case 1:
        errorCallback('This feature requires your location.  Unable to proceed.');
        break;
      case 2:
      case 3:
        errorCallback('Error getting your location.  Try again later.');
        break;
    }
  }
  // get user location
  if ("geolocation" in navigator) {
    // console.log('geolocation is available');
    navigator.geolocation.getCurrentPosition(successCallback,
      geolocationError,
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 60000
      }
    );
  } else {
    //console.log('geolocation IS NOT available');
    errorCallback('Your web browser does not allow geolocation.  Please use a browser with this feature.');
  }
};

util.navigateAfterSendingGoogleAnalytics = function() {
  
}

util.sendAgencyFeedback = function(source) {

}

util.sendAppFeedback = function(source) {

}

module.exports = util;