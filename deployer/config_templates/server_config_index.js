var config = {{}};

// Crowdsourcing
config.crowdsourceDelay = true;

// DB User Configs
config.pgWorker = {{
  gtfsUrl: '{gtfs_static_url}',
  downloadsDir: 'downloads',
  gtfsFilename: 'google_transit.zip',
  database: 'postgres://{pg_worker_username}:{pg_worker_password}@localhost:5432/{database_name}',
  isPostGIS: true,
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