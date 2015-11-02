var config = require('../config.js');
var pg = require('pg');

pg.defaults.poolSize = config.pg.pool_size;

require('../models/Error.js');

function getConnection(cb) {
  pg.connect(config.pg.connection, cb);
}

function query(sql, args, cb) {
  var client = process.domain.db;

  client.query(sql, args, function(err, res) {
    if(err) {
      var sanitized_sql = sql.replace(/[\n\t\r]/g, ' ');
      sanitized_sql = sanitized_sql.replace(/\s\s+/g, ' ');
      err.sql = sanitized_sql;
      return cb(Error.Database(err));
    } else {
      return cb(null, res);
    }
  });
}

module.exports = {
  pg: pg,
  config: config.pg,
  conn: getConnection,
  query: query
};
