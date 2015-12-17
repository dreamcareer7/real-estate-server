var io;

function postMessage(sock, room_id, message, cb) {
  if(!sock.user)
    return cb('authentication required');

  message.author = sock.user.id;

  Room.get(room_id, function(err, room) {
    if(err)
      return cb(err);

    if(!Room.belongs(room.users, message.author))
      return cb(Error.Forbidden('User is not a member of this room'));

    Message.post(room_id, message, true, function(err, message) {
      if(err)
        return cb(err);

      return cb(null, message);
    });
  });
}

function typing(room_id, cb) {
  var socket = this;
  if(!socket.user)
    return cb('Authentication required');

  io.to(room_id).emit('typing', {
    user_id:socket.user.id,
    room_id:room_id
  })
}

function typingEnded(room_id, cb) {
  var socket = this;
  if(!socket.user)
    return cb('Authentication required');

  io.to(room_id).emit('typing ended', {
    user_id:socket.user.id,
    room_id:room_id
  })
}

function messagePosted(data) {
  io.to(data.room.id).emit('new message', {
    room:Room.publicize(data.room),
    message:Message.publicize(data.message)
  });
}
Message.on('create', messagePosted);

module.exports = (socketio) => {
  io = socketio;

  io.use( (socket, next) => {
    socket.on('new message', Socket.transaction(postMessage, socket));
    socket.on('typing', typing);
    socket.on('typing ended', typingEnded);
    next();
  })
}