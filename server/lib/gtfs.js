var GTFS = require('gtfs-sequelize'),
  format = require('string-format'),
  sensitive = require('../passwords');

var gtfsConfig = {
  gtfsUrl: 'http://feed.rvtd.org/googleFeeds/static/google_transit.zip',
  downloadsDir: 'downloads',
  gtfsFilename: 'google_transit.zip',
  isPostGIS: true,
  sequelizeOptions: {
    logging: false
  }
};

var gtfs = GTFS(gtfsConfig);

module.exports = function(pgUser) {
  gtfsConfig.database = format('postgres://{0}:{1}@localhost:5432/gtfs-rvtd', 
    sensitive[pgUser].username, 
    sensitive[pgUser].password);
  
  return GTFS(gtfsConfig);
}