module.exports = function(app) {
  
  app.views = {};
  app.views.home = require('./home.js')(app);
  app.views.findVehicle = require('./findVehicle.js')(app);
  app.views.tripDetails = require('./tripDetails.js')(app);
  app.views.feedback = require('./feedback.js')(app);

}