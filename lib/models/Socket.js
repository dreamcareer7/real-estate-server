var queue = require('../utils/queue.js');

Socket = {};

Socket.send = function(event, room, args, cb) {
  var domain = process.domain;

  var job = queue.create('socket_emit', {room,event,args}).ttl(100).removeOnComplete(true);

  if(cb) {
    job.on('complete', results => {
      domain.enter();
      cb(null, results);
    });

    job.on('failed', (err) => {
      domain.enter();
      cb(err);
    });
  }

  job.save();
};

Socket.join = function(user_id, room_id) {
  var job = queue.create('socket_join', {user_id,room_id}).ttl(100).removeOnComplete(true);
  job.save();
};

Socket.isOnline = function(user_id, cb) {
  if(typeof SocketServer !== 'undefined') {
    cb(null, SocketServer.hasMembers(user_id))
    return ;
  }

  var job = queue.create('socket_has_members', {user_id}).ttl(100).removeOnComplete(true);
  job.save();
}
