var util = {};

util.sendGenericError = function(res) {
  res.send({
    success: false,
    error: 'An error occured.  If this error persists, please submit feedback at OnTransit.userecho.com'
  });
}

module.exports = util;