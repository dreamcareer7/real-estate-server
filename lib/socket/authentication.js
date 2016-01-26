var debug = require('debug')('rechat:sockets:auth');
var io = SocketServer.io;

function authenticate(socket, access_token, cb) {
  var fin = (err, user) => {
    if(err)
      debug(err);
    else
      debug('Auth successful for', user.email);

    cb(err, user);
  }

  Token.get(access_token, function (err, token) {
    if (err)
      return fin(err);

    if (!token)
      return fin('Invalid credentials');

    if(token.expire_date) {
      var expirey = new Date(token.expire_date);

      if(expirey < (new Date()).getTime()) {
        return fin('Token expired');
      }
    }

    if(token.type !== 'access')
      return fin('Invalid credentials');

    User.get(token.user_id, function (err, user) {
      if (err)
          return fin(err);

      if (!user)
          return fin('Unknown user');

      process.domain.user = user;
      socket.user = user;
      joinRooms(socket, user, () => {
        fin(null, User.publicize(user));
      });
    });
  });
}

function joinRooms(socket, user, cb) {
  //This room is dedicated to this user. All his devices will be connected to this room.
  socket.join(user.id);

  var joinRoom     = room => socket.join(room.id);
  var signalOnline = room => io.to(room.id).emit('User.Online', user.id);

  var peersPresence = (rooms) => {
    var users = {};

    rooms.map( room => room.users.map( u => users[u.id] = u ) ); //Gathers a list of uid's
    var onlines = Object.keys(users).filter( uid => SocketServer.hasMembers(users[uid].id) );

    io.to(user.id).emit('Users.Online', onlines)
  }

  Room.getUserRooms(user.id, {}, (err, rooms) => {
    if(!rooms)
      rooms = [];

    socket.user.rooms = rooms;

    rooms.map( joinRoom )
    rooms.map( signalOnline )

    peersPresence( rooms );

    cb();
  });
}

function sendSignals(socket) {
  if(!socket.user)
    return ;

  if(SocketServer.hasMembers(socket.user.id))
    return ;

  socket.user.rooms.map( room => io.to(room.id).emit('User.Offline', socket.user.id) )
}

io.use( (socket, next) => {
  socket.on('Authenticate', SocketServer.transaction(authenticate, socket));
  socket.on('disconnect', () => sendSignals(socket))
  next();
})