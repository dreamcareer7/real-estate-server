function authenticate(socket, access_token, cb) {
  Token.get(access_token, function (err, token) {
    if (err)
      return cb(err);

    if (!token)
      return cb('Invalid credentials');

    if(token.expire_date) {
      var expirey = new Date(token.expire_date);

      if(expirey < (new Date()).getTime()) {
        return cb('Token expired');
      }
    }

    if(token.type !== 'access')
      return cb('Invalid credentials');

    User.get(token.user_id, function (err, user) {
      if (err)
          return cb(err);

      if (!user)
          return cb('Unknown user');

      socket.user = user;
      joinRooms(socket, user, () => {});
      cb(null, User.publicize(user));
    });
  });
}

function joinRooms(socket, user, cb) {
  Room.getUserRooms(user.id, {}, (err, rooms) => {
    rooms.map( room => socket.join(room.id) )
  });
  socket.join(user.id);
}

module.exports = (io) => {
  io.use( (socket, next) => {
    socket.on('authenticate', Socket.transaction(authenticate, socket));
    next();
  })
}