var db     = require('./db.js');
var util   = require('util');
var config = require('../config.js');
var uuid   = require('node-uuid');
var redis  = require('redis');

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

  var agent = req.headers['user-agent'] ? req.headers['user-agent'].split(/\s/)[0] : '';

  var text = '(' + req.rechat_id.cyan + ') ';
  text    += (elapsed + 'ms\t')[elapsedColor];
  text    += 'Σ' + ((process.domain.db && process.domain.db.query_count) ? process.domain.db.query_count : 0) + '\t';
  text    += ('HTTP ' + res.statusCode)[statusColor];
  text    += (' ' + req.method + ' ' + req.url + '  ')[statusColor];
  text    += name[userColor] + ' ' + (agent);
  text    += req.headers['authorization'] ? req.headers['authorization'] : '';

  console.log(text);
}

var redisClient = redis.createClient(config.redis);

function saveBody(req) {
  var ct = req.headers['content-type'];
  if(!ct)
    return ;

  if(ct.toLowerCase() !== 'application/json')
    return ;

  if(!req.body)
    return ;

  var blacklist = [
    '/oauth2/token'
  ];

  if(blacklist.indexOf(req.path) > -1)
    return ;

  redisClient.hset('bodies', req.rechat_id, JSON.stringify(req.body));
}

module.exports = function(app) {
  app.use(function(req, res, next) {
    req.start = new Date();
    req.rechat_id = uuid.v1();
    res.setHeader('X-Request-ID', req.rechat_id);
    res.on('finish', logRequest);
    next();
    saveBody(req);
  });
};
