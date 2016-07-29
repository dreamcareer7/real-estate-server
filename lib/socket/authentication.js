var async = require('async')
var debug = require('debug')('rechat:sockets:auth');
var queue  = require('../../lib/utils/queue.js');
var config = require('../../lib/config.js');
var redis = require('redis');

var redisClient = redis.createClient(config.redis);

var io = SocketServer.io;

var time = () => {
  return (new Date()).getTime();
}

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
        // It removes previous Background indications and also announces to everyone that he is online.
        removeFromBackground(socket);
        announceUserStatus(socket);

        fin(null, User.publicize(user));
      });
    });
  });
}

function joinRooms(socket, user, cb) {
  var getState = (uid, cb) => SocketServer.getUserStatus(uid, (err, state) => {
    if(err)
      return cb(err);

    cb(null, {user_id:uid, state:state});
  })

  var peersPresence = (rooms) => {
    async.map(rooms.map(r => r.id), Room.getUsersIDs, (err, results) => {
      var users = new Set;
      results.forEach(room_users => {
        room_users.map(uid => users.add(uid))
      })

      async.map(Array.from(users), getState, (err, states) => {
        if(err)
          return cb(err);

        io.to(user.id).emit('Users.States', states)
      });
    })
  }

  var joinRoom = room => socket.join(room.id);

  // If user disconnectrs before getUserRooms is completed,
  // socket.user.rooms will not be an array, which makes the app crash later
  // on the sendSignals function.
  // Defining the array here prevents that
  socket.user.rooms = [];

  //This room is dedicated to this user. All his devices will be connected to this room.
  socket.join(user.id, () => {
    Room.getUserRooms(user.id, {}, (err, rooms) => {
      if(!rooms)
        rooms = [];

      socket.user.rooms = rooms;

      rooms.map( joinRoom );

      peersPresence( rooms );

      cb();
    });
  });
}

function announceUserStatus(socket) {
  SocketServer.getUserStatus(socket.user.id, (err, status) => {
    socket.user.rooms.map( room => io.to(room.id).emit('User.State', status, socket.user.id) );
  })
}

function considerOffline(socket) {
  if(!socket.user)
    return ; // Wasnt a logged in user.

  if(SocketServer.hasMembers(socket.user.id))
    return ; // Has other connections available and is therefore, online

  announceUserStatus(socket);
}

var backgrounds = {};

function considerAsBackground(socket) {
  if(!socket.user)
    return ; // Wasnt a logged in user.

  redisClient.zadd('backgrounds', time(), socket.user.id, () => {})

function removeFromBackground(socket) {
  if(!socket.user)
    return ; // Wasnt a logged in user.

  redisClient.zrem('backgrounds', socket.user.id, () => {});
}


SocketServer.getUserStatus = (user_id, cb) => {
  if (SocketServer.hasMembers(user_id))
    return cb(null, User.ONLINE);

  redisClient.zscore('backgrounds', user_id, (err, score) => {
    if(err)
      return cb(null, User.OFFLINE);

    var out_for = time() - score;

    if(out_for && out_for < 15 * 60 * 1000)
      return cb(null, User.BACKGROUND);

    cb(null, User.OFFLINE);
  });
}

queue.process('socket_user_status', 10000, function(job, done) {
  SocketServer.getUserStatus(job.data.user_id, done)
});

io.use( (socket, next) => {
  socket.on('Authenticate', SocketServer.transaction(authenticate, socket));

  socket.on('Background', () => {
    considerAsBackground(socket);
    announceUserStatus(socket);
  })

  socket.on('Offline',    () => {
    removeFromBackground(socket);
    announceUserStatus(socket);
  });

  socket.on('disconnect', () => considerOffline(socket));
  
  next();
});
