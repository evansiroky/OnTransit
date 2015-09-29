var config = {{}};

//Number of minutes to keep delay calculations
config.block_delay_delete_threshold = {block_delay_delete_threshold};

// Crowdsourcing
config.crowdsourceDelay = true;

//Trip Search Padding (in minutes)
config.tripEndPadding = {trip_end_padding};
config.tripStartPadding = {trip_end_padding};

// Nearby Stop Padding (in minutes)
config.nearbyStopFuturePadding = {nearby_stop_future_padding};
config.nearbyStopPastPadding = {nearby_stop_past_padding};

// DB User Configs
config.pgWorker = {{
  gtfsUrl: '{gtfs_static_url}',
  downloadsDir: 'downloads',
  gtfsFileOrFolder: 'google_transit.zip',
  database: 'postgres://{pg_worker_username}:{pg_worker_password}@localhost:5432/{database_name}',
  isPostGIS: true,
  workerUserName: '{pg_worker_username}',
  webUsername: '{pg_web_username}',
  sequelizeOptions: {{
    logging: false
  }}
}};

config.pgWeb = {{
  database: 'postgres://{pg_web_username}:{pg_web_password}@localhost:5432/{database_name}',
  isPostGIS: true,
  sequelizeOptions: {{
    logging: false
  }}
}};

module.exports = config;