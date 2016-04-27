var I = require('intercom-client');
var config = require('../config.js');
var client = new I.Client(config.intercom.app, config.intercom.key);

Intercom = {};
Intercom.User = {};

var userQueue = {};

var timestamp = () => Math.floor((new Date()).getTime() / 1000);

Intercom.User.update = function(user, ip) {
  userQueue[user.id] = {
    user_id: user.id,
    email: user.email,
    name: user.first_name + ' ' + user.last_name,
    update_last_request_at: true,
    created_at: user.created_at,
    updated_at: user.update_at,
    last_seen_ip: ip,
    last_request_at: timestamp()
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

  client.users.bulk(data)
  userQueue = {};
}


var eventQueue = [];
Intercom.Event = {};

Intercom.Event.create = function(data) {
  eventQueue.push({
    event_name: data.event,
    created_at: timestamp(),
    user_id: data.user.id,
    metadata:data.metadata
  })
}

function sendEvents() {
  if(eventQueue.length < 1)
    return ;

  var data = eventQueue.map(e => {
    return {create:e}
  })

  client.events.bulk(data)
  eventQueue = [];
}

setInterval(sendUsers, 5000)
setInterval(sendEvents, 5000)