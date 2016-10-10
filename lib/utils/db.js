var config = require('../config.js');
var pg = require('pg');
var debug = require('debug')('rechat:db');

pg.defaults.poolSize = config.pg.pool_size;

require('../models/Error.js');

function getConnection(cb) {
  pg.connect(config.pg.connection, cb);
}

function query(sql, args, cb) {
  var client = process.domain.db;

  if(!process.domain.db.query_count)
    process.domain.db.query_count = 0

  process.domain.db.query_count++;

  client.query(sql, args, function(err, res) {
    debug(JSON.stringify({
      query:sql,
      params:args,
      error:err,
      res: res ? res.rows : null
    }));

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
