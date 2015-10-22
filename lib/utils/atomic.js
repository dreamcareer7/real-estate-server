var db = require('./db.js');
var Domain = require('domain');

function transaction(req, res, next) {
  db.conn(function(err, conn, done) {
    var domain = Domain.create();
    if(err) {
      return next(Error.Database(err));
    }

    var rollback = function() {
      console.log('Rolling back', req.url);
      domain.exit();
      conn.query('ROLLBACK', done);
    }

    conn.query('BEGIN', function(err) {
      if(err) {
        return next(Error.Database(err));
      }

      domain.db = conn;
      domain.run(next);
    });

    var end = res.end;

    domain.on('error', function(e) {
      res.error(Error.Generic(e.message));
      rollback();
    });

    res.end = function(data, encoding, callback) {
      conn.query('COMMIT', function() {
        done();
        end.call(res, data, encoding, callback);
      });
    }

    // You might want to ask yourself why this is necessary?
    // Looks like that res.end() does not get called if a connection gets
    // terminated halfway through. What happens a sequence of funny events known to our team as
    // "The Fucking Timeout Issues". We make sure that if a request gets closed for any reason,
    // we do a rollback on current database, and immediately terminate whatever we're doing.
    req.on('close', rollback);
  });
}

module.exports = function(app) {
  app.use(transaction);
}