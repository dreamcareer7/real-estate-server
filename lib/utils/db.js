var pg = require('pg');
var config = require('../config.js');
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
        return cb(Error.Database(sanitized_sql));
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
}