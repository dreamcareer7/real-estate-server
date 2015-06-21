var pg = require('pg');
var config = require('../config.js');

function getConnection(cb) {
  pg.connect(config.pg.connection, cb);
}

function query(sql, args, cb) {
  var client = process.domain.db;

    client.query(sql, args, function(err, res) {
      if(err) {
        err.sql = sql.replace(/'\n'/g, '');
        if(cb)
          cb(Error.Database(err))
        return ;
      }

      if(cb)
        cb(null, res);
    });
}

module.exports = {
  pg: pg,
  config: config.pg,
  conn: getConnection,
  query: query
}