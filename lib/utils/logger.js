var db = require('./db.js');
var util = require('util');
var winston = require('winston');
var expressWinston = require('express-winston');
var config = require('../config.js');

module.exports = function(app) {
  app.use(function(req, res, next) {
    var rid = req.get('x-request-id');
    if(rid)
      req.reqid = rid;

    next();
  });

  app.use(expressWinston.logger({
    transports: [
      new(winston.transports.Console)({
        colorize: true
      })
    ]
  }));

  app.use(function(req, res, next) {
    req._routeWhitelists.req.push('reqid');
    next();
  });
}
