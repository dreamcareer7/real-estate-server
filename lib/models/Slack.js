var request = require('request');
var config = require('../config.js');

Slack = {};

Slack.send = function(options, cb) {
  if(!config.slack.enabled) {
    if(cb)
      cb();
    
    return ;
  }

  var payload = {
    channel: '#'+options.channel,
    username: config.slack.name,
    icon_emoji: options.emoji,
    text: options.text
  }

  var headers = {};

  var options = {
    url: config.slack.webhook,
    method: 'POST',
    headers: headers,
    form: {
      payload:JSON.stringify(payload)
    }
  };

  request.post(options, cb);
}