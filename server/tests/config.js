var config = {};

// Crowdsourcing
config.crowdsourceDelay = true;

// Trip Search Padding (in minutes)
config.tripEndPadding = 180;
config.tripStartPadding = 10;

// Nearby Stop Padding (in minutes)
config.nearbyStopFuturePadding = 40;
config.nearbyStopPastPadding = 5;

// DB User Configs
config.pgWorker = {
  gtfsUrl: 'http://feed.rvtd.org/googleFeeds/static/google_transit.zip',
  downloadsDir: 'downloads',
  gtfsFilename: 'google_transit.zip',
  database: 'postgres://test_worker:password@localhost:5432/ontransit-test',
  isPostGIS: true,
  workerUserName: 'test_worker',
  webUsername: 'test_web',
  sequelizeOptions: {
    logging: false
  }
};

config.pgWeb = {
  database: 'postgres://test_web:password@localhost:5432/ontransit-test',
  isPostGIS: true,
  sequelizeOptions: {
    logging: false
  }
};

module.exports = config;