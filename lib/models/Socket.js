var queue = require('../utils/queue.js');

Socket = {};

Socket.send = function(event, room, args, cb) {
  var domain = process.domain;

  var job = queue.create('socket_emit', {room,event,args}).ttl(100).removeOnComplete(true);

  job.on('complete', results => {
    domain.enter();
    cb(null, results);
  });

  job.on('failed', (err) => {
    domain.enter();
    cb(err);
  });

  job.save();
};
