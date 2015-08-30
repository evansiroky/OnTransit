var GTFS = require('gtfs-sequelize'),
  format = require('string-format'),
  config = require('../config');

var gtfsConfig = {
  gtfsUrl: 'http://feed.rvtd.org/googleFeeds/static/google_transit.zip',
  downloadsDir: 'downloads',
  gtfsFilename: 'google_transit.zip',
  isPostGIS: true,
  sequelizeOptions: {
    logging: false
  }
};

module.exports = function(pgUser) {
  gtfsConfig.database = format('postgres://{0}:{1}@localhost:5432/gtfs-rvtd', 
    config[pgUser].username, 
    config[pgUser].password);
  
  var worker = GTFS(gtfsConfig);
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