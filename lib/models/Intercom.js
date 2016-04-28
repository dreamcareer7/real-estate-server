var I = require('intercom-client');
var config = require('../config.js');
var client = new I.Client(config.intercom.app, config.intercom.key);

var timestamp = () => Math.floor((new Date()).getTime() / 1000);

Intercom = {};
Intercom.User = {};

var userQueue = {};
Intercom.User.update = function(user, ip) {
  userQueue[user.id] = {
    user_id: user.id,
    email: user.email,
    name: user.first_name + ' ' + user.last_name,
    signed_up_at: Math.floor(user.created_at),
    last_seen_ip: ip,
//     last_request_at: timestamp(),
    update_last_requested_at:true
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

var tagQueue = {};

Intercom.User.tag = function(tag, user) {
  if(!tagQueue[tag])
    tagQueue[tag] = [];

  tagQueue[tag].push(user.id);
}

function tagUsers() {
  var data = Object.keys(tagQueue).map(tag => {
    return {
      name:tag,
      users:tagQueue[tag].map(uid => {
        return {user_id:uid}
      })
    }
  })

  if(data.length < 1)
    return ;

  client.tags.create(data)
  tagQueue = {};
}

var eventQueue = [];
Intercom.Event = {};

Intercom.Event.create = function(data) {
  Intercom.User.update(data.user);

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
setInterval(tagUsers, 5000)
setInterval(sendEvents, 5000)