var request = require('request');
var config = require('../../lib/config.js');

function reportToSlack(text, cb) {
  var payload = {
    channel: '#ntreis-updates',
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
    cb(err);
  });
}
var startTime = (new Date()).getTime();

function getElapsed() {
  return ((new Date()).getTime()) - startTime;
}

module.exports = {elapsed:getElapsed, report:reportToSlack};