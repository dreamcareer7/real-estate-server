var SocketIO = require('socket.io');
var io;

function attach(server) {
  io = new SocketIO(server);
  io.use(attachEvents);
}

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
      cb(null, user);
    });
  });
}

function joinRooms(socket, user, cb) {
  Room.getUserRooms(user.id, {}, (err, rooms) => {
    rooms.map( room => socket.join(room.id) )
    rooms.map( room => console.log('Joining', room.id) )
  });
}

var db = require('./db.js');
var Domain = require('domain');

function transaction(fn, socket) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var cb = args[args.length - 1];

    db.conn(function(err, conn, done) {
      var domain = Domain.create();
      if(err) {
        return cb(Error.Database(err));
      }

      var rollback = function() {
        console.log('<- Rolling back'.red, arguments);
        domain.exit();
        conn.query('ROLLBACK', done);
      };

      var commit = () => {
        conn.query('COMMIT', function() {
          domain.jobs.map( job => job.save() );
          done();
        });
      }

      domain.on('error', function(e) {
        console.log(e);
        rollback();
      });

      if(typeof cb === 'function') {
        args[args.length-1] = (err, res) => {
          if(err) {
            rollback();
            cb(err);
            return ;
          }

          commit();
          cb(null, res);
        }
      } else
        args.push(commit);

      conn.query('BEGIN', function(err) {
        if(err) {
          return next(Error.Database(err));
        }

        domain.db = conn;
        domain.jobs = [];

        args.unshift(socket);
        return domain.run(() => fn.apply(null, args));
      });
    });
  }
}



function attachEvents(socket, next) {
  socket.on('authenticate', transaction(authenticate, socket));
  socket.on('new message',  transaction(postMessage,  socket));
  next();
}

function postMessage(sock, room_id, message, cb) {
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

function messagePosted(data) {
  io.to(data.room.id).emit('new message', data);
}

Message.on('create', messagePosted);

module.exports = attach;
