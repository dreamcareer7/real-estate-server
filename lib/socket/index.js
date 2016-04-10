var db = require('../utils/db.js');
var Domain = require('domain');
var SocketIO = require('socket.io');
var queue  = require('../../lib/utils/queue.js');
var EventEmitter = require('events').EventEmitter;

var io;

SocketServer = new EventEmitter;

function attach(server) {
  io = new SocketIO(server);
  SocketServer.io = io;

  [
    'authentication',
    'messaging',
  ].map( name => require('./' + name + '.js') );
}

SocketServer.transaction = function(fn, socket) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var cb = args[args.length - 1];

    db.conn(function(err, conn, done) {
      var domain = Domain.create();
      domain.user = socket.user;
      domain.function = fn.name;
      domain.socket = socket;

      SocketServer.emit('transaction', domain)

      if(err) {
        return cb(Error.Database(err));
      }

      var rollback = function() {
        console.log('<- Rolling back'.red);
        conn.query('ROLLBACK', done);
      };

      var commit = () => {
        conn.query('COMMIT', function() {
          Job.handle(domain.jobs, err => {
            if(err)
              console.log('⚠ SOCKET JOB Panic:'.red, err, err.stack);

            done();
          });
        });
      };

      domain.on('error', function(e) {
        delete e.domain;
        delete e.domainThrown;
        delete e.domainEmitter;
        delete e.domainBound;

        console.log('⚠ SOCKET Panic:'.yellow, e, e.stack);
        rollback();
      });

      if(typeof cb === 'function') {
        args[args.length-1] = function(e) {
          if(e)
            throw e;

          commit();
          cb.apply(socket, arguments);
        };
      } else
        args.push((e) => {
          if(e)
            throw e;
          commit();
        });

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
};

SocketServer.hasMembers = (room) => {
  var sockets = io.sockets.adapter.rooms[room];
  if(!sockets)
    return false;

  if(Object.keys(sockets).length < 1)
    return false;

  return true;
};

module.exports = attach;


queue.process('socket_emit', 1000, function(job, done) {
  if(!SocketServer.hasMembers(job.data.room))
    return done('No online users found');

  job.data.args.unshift(job.data.event);
  var r = io.to(job.data.room);
  r.emit.apply(r, job.data.args);

  done();
});

queue.process('socket_join', (job, done) => {
  if(!SocketServer.hasMembers(job.data.user_id))
    return done();

  var sockets = io.sockets.adapter.rooms[job.data.user_id];
  if(!sockets)
    return false;

  Object.keys(sockets.sockets).map( socket_id => {
    var socket = io.sockets.connected[socket_id];

    socket.join(job.data.room_id);
    socket.user.rooms.push(job.data.room_id);
  })
})