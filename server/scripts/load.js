var gtfs = require('../lib/gtfs.js');

gtfsWorker = gtfs('pgWorker');

gtfsWorker.downloadGtfs(function() {
  //download has finished callback
  gtfsWorker.loadGtfs(function() {
    //database loading has finished callback
    console.log('database is loaded');
  });
});