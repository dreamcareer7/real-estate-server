var async = require('async')
var debug = require('debug')('rechat:sockets:auth');
var queue  = require('../../lib/utils/queue.js');

var io = SocketServer.io;

function authenticate(socket, access_token, cb) {
  var fin = (err, user) => {
    if(err)
      debug(err);
    else
      debug('Auth successful for', user.email);

    cb(err, user);
  };

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
  var signalOnline = room => io.to(room.id).emit('User.Status', User.ONLINE, user.id);

  var peersPresence = (rooms) => {
    async.map(rooms.map(r => r.id), Room.getUsersIDs, (err, results) => {
      var users = new Set;
      results.forEach(room_users => {
        room_users.map(uid => users.add(uid))
      })

      var states = Array.from(users).map(uid => {
        return {
          user_id:uid,
          status:SocketServer.getUserStatus(uid)
        }
      });

      io.to(user.id).emit('Users.States', states)
    })
  }

  // If user disconnectrs before getUserRooms is completed,
  // socket.user.rooms will not be an array, which makes the app crash later
  // on the sendSignals function.
  // Defining the array here prevents that
  socket.user.rooms = [];

  Room.getUserRooms(user.id, {}, (err, rooms) => {
    if(!rooms)
      rooms = [];

    socket.user.rooms = rooms;

    rooms.map( joinRoom );
    rooms.map( signalOnline );

    peersPresence( rooms );

    cb();
  });
}

function announceUserStatus(socket) {
  var status = SocketServer.getUserStatus(socket.user.id);
  socket.user.rooms.map( room => io.to(room.id).emit('User.Status', status, socket.user.id) );
}

function sendOfflineSignals(socket) {
  if(!socket.user)
    return ; // Wasnt a logged in user.

  if(SocketServer.hasMembers(socket.user.id))
    return ; // Has other connections available and is therefore, online

  announceUserStatus(socket);
}

var backgrounds = {};

function sendBackgroundSignals(socket) {
  if(!socket.user)
    return ; // Wasnt a logged in user.

  backgrounds[socket.user.id] = true;
}

SocketServer.getUserStatus = user_id => {
  if (SocketServer.hasMembers(user_id))
    return User.ONLINE;

  if (backgrounds[user_id])
    return User.BACKGROUND;

  return User.OFFLINE;
}

queue.process('socket_user_status', 10000, function(job, done) {
  done(null, SocketServer.getUserStatus(job.data.user_id));
});

io.use( (socket, next) => {
  socket.on('Authenticate', SocketServer.transaction(authenticate, socket));
  socket.on('Background', () => sendBackgroundSignals(socket));
  socket.on('disconnect', () => sendOfflineSignals(socket));
  next();
});
