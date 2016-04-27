var I = require('intercom-client');
var config = require('../config.js');
var client = new I.Client(config.intercom.app, config.intercom.key);

Intercom = {};
Intercom.User = {};

var userQueue = {};

Intercom.User.update = function(user, ip) {
  userQueue[user.id] = {
    user_id: user.id,
    email: user.email,
    name: user.first_name + ' ' + user.last_name,
    update_last_request_at: true,
    created_at: user.created_at,
    updated_at: user.update_at,
    last_seen_ip: ip,
    update_last_request_at: true
  }
}

function sendUsers() {
  var data = Object.keys(userQueue).map( id => {
    return {
      create:userQueue[id]
    }
  });

  if(data.length < 1)
    return ;

  client.users.bulk(data, function (res) {})
  userQueue = {};
}

setInterval(sendUsers, 10000)

Intercom.Event = {};

Intercom.Event.create = function(data) {
  client.events.create({
    event_name: data.event,
    created_at: Math.floor((new Date()).getTime() / 1000),
    user_id: data.user.id,
    metadata:data.metadata
  }, function (res) {
    if(res.code !== 202)
      console.log('Cannot report action to intercom', res.body)
  });
}