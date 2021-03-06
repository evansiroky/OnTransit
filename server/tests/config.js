var config = {};

// Number of minutes to keep delay calculations
config.block_delay_delete_threshold = 10;

// Crowdsourcing
config.crowdsourceDelay = true;

// Trip Search Padding (in minutes)
config.tripEndPadding = 30;
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
  spatial: true,
  workerUserName: 'test_worker',
  webUsername: 'test_web',
  sequelizeOptions: {
    logging: false
  }
};

config.pgWeb = {
  database: 'postgres://test_web:password@localhost:5432/ontransit-test',
  spatial: true,
  sequelizeOptions: {
    logging: false
  }
};

module.exports = config;