var db = require('../utils/db.js');
var Domain = require('domain');
var SocketIO = require('socket.io');
var io;

function attach(server) {
  io = new SocketIO(server);
  [
    'authentication',
    'messaging',
    'rooms'
  ].map( name => require('./'+name+'.js')(io) )
}

Socket = {};

Socket.transaction = function(fn, socket) {
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


module.exports = attach;
