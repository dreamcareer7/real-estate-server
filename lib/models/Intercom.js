var I = require('intercom-client');
var config = require('../config.js');
var client = new I.Client(config.intercom.app, config.intercom.key);

var timestamp = () => Math.floor((new Date()).getTime() / 1000);

// We have some code to queue intercom calls and use their bulk API to minimize number of calls
// However, the bulk jobs are usually handled after several hours
// Which makes it useless.
// We can disable the queueing by this variable.
var queue = false;

Intercom = {};
Intercom.User = {};

function error(res) {
  if(res.status > 299)
    console.log('Intercom error', res.body);
}

var userQueue = {};
Intercom.User.update = function(user, ip, agent) {
  var u = {
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
  };

  if(queue) {
    userQueue[user.id] = u
    return ;
  }

  client.users.create(u, error);
}
function sendUsers() {
  var data = Object.keys(userQueue).map( id => {
    return {
      create:userQueue[id]
    }
  });

  if(data.length < 1)
    return ;

  client.users.bulk(data, error)
  userQueue = {};
}


Intercom.User.tag = function(tag, user_id) {
  client.tags.tag({name:tag, users:[{user_id:user_id}]}, error);
}

var eventQueue = [];
Intercom.Event = {};

Intercom.Event.create = function(data, ip, agent) {
  Intercom.User.update(data.user, ip, agent);

  var e = {
    event_name: data.event,
    created_at: timestamp(),
    user_id: data.user.id,
    metadata:data.metadata
  };

  if(queue) {
    eventQueue.push(e);
    return ;
  }

  client.events.create(e, error);
}

function sendEvents() {
  if(eventQueue.length < 1)
    return ;

  var data = eventQueue.map(e => {
    return {create:e}
  })

  client.events.bulk(data, error);
  eventQueue = [];
}

if(queue) {
  setInterval(sendUsers, 5000)
  setInterval(sendEvents, 5000)
}