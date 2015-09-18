var GTFS = require('gtfs-sequelize');

module.exports = function(dbconfig) {
  
  var worker = GTFS(dbconfig);
  worker.getConnection = function() {
    var db = worker.connectToDatabase(),
      BlockDelay = db.sequelize.import('../models/blockDelay.js'),
      DailyTrip = db.sequelize.import('../models/dailyTrip.js'),
      DailyStopTime = db.sequelize.import('../models/dailyStopTime.js');

    db.daily_trip = DailyTrip;
    db.daily_stop_time = DailyStopTime;
    db.block_delay = BlockDelay;

    db.shape_gis.hasMany(db.daily_trip, {
      foreignKey: 'shape_id'
    });

    db.stop_time.hasMany(db.daily_trip, {
      foreignKey: 'trip_id'
    });

    db.stop.hasMany(db.daily_stop_time, {
      foreignKey: 'stop_id'
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