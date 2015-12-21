var io = SocketServer.io;

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
  if(!socket.user) {
    if(cb)
      cb('Authentication required');
    return ;
  }

  io.to(room_id).emit('User.Typing', {
    user_id:socket.user.id,
    room_id:room_id
  })
}

function typingEnded(room_id, cb) {
  var socket = this;
  if(!socket.user) {
    if(cb)
      cb('Authentication required');

    return ;
  }

  io.to(room_id).emit('User.TypingEnded', {
    user_id:socket.user.id,
    room_id:room_id
  })
}

io.use( (socket, next) => {
  socket.on('Message.Send',     SocketServer.transaction(postMessage, socket));
  socket.on('User.Typing',      typing);
  socket.on('User.TypingEnded', typingEnded);
  next();
})