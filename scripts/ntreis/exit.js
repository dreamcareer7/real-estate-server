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

function considerExit(err) {
  if(err)
    console.log('Error', err.red);

  var remaining = parseInt(config.ntreis.pause - getElapsed());

  if (remaining < 0)
    process.exit();

  console.log('Pausing for'.yellow,
              remaining,
              'milliseconds before termination to meet NTREIS limit on heavy requests...'.yellow);

  setTimeout(process.exit, remaining);
}

module.exports = {exit:considerExit, elapsed:getElapsed, slack:reportToSlack};