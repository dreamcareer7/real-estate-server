var util = require('util');
var winston = require('winston');
var db = require('./db.js');
var expressWinston = require('express-winston');

var Logger = function (options) {
  winston.Transport.call(this, options);
}

util.inherits(Logger, winston.Transport);

winston.transports.Logger = Logger;

Logger.prototype.name = 'Shortlisted Logger';

Logger.prototype.log = function (level, msg, meta, callback) {

  if (this.silent) {
    return callback && callback(null, true);
  };

  var self = this;
  if (meta.req.reqid) {
    var sql_insert = 'INSERT INTO logs (id, time, level, message, meta) VALUES ($1, to_timestamp($2), $3, $4, $5) RETURNING id';
    db.query(sql_insert, [meta.req.reqid, (new Date().getTime()) / 1000, level, msg, meta], callback);
  }

  var sql_insert = 'INSERT INTO logs (time, level, message, meta) VALUES (to_timestamp($1), $2, $3, $4) RETURNING id';
  db.query(sql_insert, [(new Date().getTime()) / 1000, level, msg, meta], callback);
}

winston.add(Logger);

module.exports = function(app) {
  app.use(function(req, res, next) {
    if(rid = req.get('x-request-id'))
      req.reqid = rid;

    next();
  });

  app.use(expressWinston.logger({
    transports: [
      new(winston.transports.Console)({
        json: false,
        colorize: true
      }),
      new(Logger)
    ]
  }));

  app.use(function(req, res, next) {
    req._routeWhitelists.req.push('reqid');
    next();
  });
}
