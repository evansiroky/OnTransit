var moment = require('moment-timezone'),
  config = require('../config'),
  GTFSWorker = require('../lib/gtfsWorker.js'),
  gtfsWorker = GTFSWorker(config.pgWorker),
  db = gtfsWorker.getConnection();

db.block_delay.destroy({
  where: {
    updatedAt: {
      lt: moment().subtract(config.block_delay_delete_threshold, 'minutes').toDate()
    }
  }
}).then(function() {

});