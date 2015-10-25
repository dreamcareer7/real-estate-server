var winston = require('winston');
var expressWinston = require('express-winston');

module.exports = function(app) {
  app.use(expressWinston.logger({
    transports: [
      new(winston.transports.Console)({
        error: true,
        json: false,
        colorize: true,
        level: 'error'
      })
    ]
  }));
};
