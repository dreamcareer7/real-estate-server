var I = require('intercom-client');
var config = require('../config.js');
var client = new I.Client(config.intercom.app, config.intercom.key);

var timestamp = () => Math.floor((new Date()).getTime() / 1000);

Intercom = {};
Intercom.User = {};

var userQueue = {};
Intercom.User.update = function(user, ip, agent) {
  userQueue[user.id] = {
    user_id: user.id,
    email: user.email,
    name: user.first_name + ' ' + user.last_name,
    signed_up_at: Math.floor(user.created_at),
    last_seen_ip: ip,
    last_request_at: timestamp(),
    last_seen_user_agent:agent,
    custom_data : {
      is_shadow: user.is_shadow,
      user_type: user.user_type,
      user_status: user.user_status,
      email_confirmed: user.email_confirmed,
      phone_confirmed: user.phone_confirmed
    }
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


Intercom.User.tag = function(tag, user_id) {
  client.tags.tag({name:tag, users:[{user_id:user_id}]});
}

var eventQueue = [];
Intercom.Event = {};

Intercom.Event.create = function(data, ip, agent) {
  Intercom.User.update(data.user, ip, agent);

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

  client.events.bulk(data);
  eventQueue = [];
}

setInterval(sendUsers, 5000)
setInterval(sendEvents, 5000)