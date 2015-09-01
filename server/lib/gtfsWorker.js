var GTFS = require('gtfs-sequelize');

module.exports = function(dbconfig) {
  
  var worker = GTFS(dbconfig);
  worker.getConnection = function() {
    var db = worker.connectToDatabase(),
      DailyTrip = db.sequelize.import('../models/dailyTrip.js'),
      TripDelay = db.sequelize.import('../models/tripDelay.js');
    db.daily_trip = DailyTrip;
    db.trip_delay = TripDelay;

    db.shape_gis.hasMany(db.daily_trip, {
      foreignKey: 'shape_id'
    });

    Object.keys(db).forEach(function(modelName) {
      if ("associate" in db[modelName]) {
        db[modelName].associate(db);
      }
    });

    db.close = function() {
      db.sequelize.close();
    }

    return db;
  }

  return worker;

}