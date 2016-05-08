var db     = require('./db.js');
var util   = require('util');
var config = require('../config.js');
var uuid   = require('uuid');

function logRequest() {
  var res = this;
  var req = this.req;
  var statusColor;

  if(res.statusCode < 400)
    statusColor = 'green';
  else if (res.statusCode < 500)
    statusColor = 'yellow';
  else
    statusColor = 'red';

  var elapsed = (new Date()).getTime() - req.start;
  var elapsedColor;

  if(elapsed < 200)
    elapsedColor = 'green';
  else if(elapsed < 1000)
    elapsedColor = 'yellow';
  else
    elapsedColor = 'red';

  var name;
  if(req.user && req.user.type === 'user') // It could also be a session response on ClientPassword requests
    name = '(' + req.user.email + ')';
  else
    name = '(Guest)';

  var userColor;
  if(!req.user)
    userColor = 'white';
  else if(req.user && req.user.email_confirmed)
    userColor = 'green';
  else
    userColor = 'red';

  var text = '(' + req.rechat_id.cyan + ') ';
  text    += (elapsed + 'ms\t')[elapsedColor];
  text    += ('HTTP ' + res.statusCode)[statusColor];
  text    += (' ' + req.method + ' ' + req.url + '  ')[statusColor];
  text    += name[userColor] + ' ' + (req.headers['user-agent'].split(/\s/)[0]);
  text    += ' ' + (req.ips[0] || req.ip || 'Unknown') + ' ';
  text    += req.headers['authorization'];

  console.log(text);
}

module.exports = function(app) {
  app.use(function(req, res, next) {
    req.start = new Date();
    req.rechat_id = uuid.v1();
    res.on('finish', logRequest);
    next();
  });
};
