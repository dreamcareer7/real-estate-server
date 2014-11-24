var pg = require('pg');
var config = require('../config.js');

function getConnection(cb) {
  pg.connect(config.pg.connection, cb);
}

function query(sql, args, cb) {
  getConnection(function(err, client, done) {
    if(err) {
      if(cb)
        cb(Error.DB(err));

      return ;
    }

    client.query(sql, args, function(err, res) {
      done();
      if(err) {
        if(cb)
          cb(Error.DB(err))
        return ;
      }

      if(cb)
        cb(null, res);
    });
  });
}

module.exports = {
  pg:pg,
  config:config.pg,
  conn:getConnection,
  query:query
}