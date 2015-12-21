var db = require('../utils/db.js');
var Domain = require('domain');
var SocketIO = require('socket.io');
var queue  = require('../../lib/utils/queue.js');
var io;

SocketServer = {};

function attach(server) {
  io = new SocketIO(server);
  SocketServer.io = io;

  [
    'authentication',
    'rooms',
    'notifications'
  ].map( name => require('./'+name+'.js') )
}



SocketServer.transaction = function(fn, socket) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var cb = args[args.length - 1];

    db.conn(function(err, conn, done) {
      var domain = Domain.create();
      if(err) {
        return cb(Error.Database(err));
      }

      var rollback = function() {
        console.log('<- Rolling back'.red);
        conn.query('ROLLBACK', done);
        domain.exit();
      };

      var commit = () => {
        conn.query('COMMIT', function() {
          domain.jobs.map( job => job.save() );
          done();
        });
      }

      domain.on('error', function(e) {
        console.trace(e);
        rollback();
      });

      if(typeof cb === 'function') {
        args[args.length-1] = function() {
          commit();
          cb.apply(socket, arguments);
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

SocketServer.hasMembers = (room) => {
  var sockets = io.sockets.adapter.rooms[room];
  if(!sockets)
    return false;

  if(Object.keys(sockets).length < 1)
    return false;

  return true;
}
module.exports = attach;


queue.process('socket_emit', 1000, function(job, done) {
  if(!SocketServer.hasMembers(job.data.room))
    return done('No online users found');

  var r = io.to(job.data.room);
  r.emit.apply(r, job.data.args);
  done();
});

