var request = require('request');
var config = require('../config.js');
var format = require('util').format;

function reportToSlack(text) {
  var payload = {
    channel: '#server-errors',
    username: config.slack.this,
    icon_emoji: ':house:',
    text: text
  };

  var headers = {
    'User-Agent': 'Super Agent/0.0.1',
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  var options = {
    url: config.slack.webhook,
    method: 'POST',
    headers: headers,
    form: {
      payload:JSON.stringify(payload)
    }
  };

  request.post(options, function(err, res, body) {
    if(err) {
      console.log('Error sending update to slack:', err);
    }
  });
}

function report(req, e) {
  if(!e.http)
    e.http = 500;

  delete e.domain;
  delete e.domainThrown;
  delete e.domainEmitter;
  delete e.domainBound;

  var user = req.user ? (req.user.first_name + ' ' + req.user.last_name) : 'Guest';
  var text = ':x: %s %s (Error %d)\n :memo: %s\n:person_with_blond_hair::skin-tone-5: %s (%s)\n---\n';
  text = format(text, req.method, req.headers['host']+req.path, e.http, e.message, user, req.headers['user-agent'])
  reportToSlack(text)

}

function middleware(req, res, next) {
  process.domain.on('error', report.bind(null, req))
  next();
}

module.exports = (app) => {
  if(process.env.NODE_ENV !== 'production')
    return ;

  app.use(middleware)
}