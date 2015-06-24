var db = require('./db.js');
var Domain = require('domain');

function transaction(req, res, next) {
  db.conn(function(err, conn, done) {
    if(err) {
      return next(Error.Database(err));
    }

    conn.query('BEGIN', function(err) {
      if(err) {
        return next(Error.Database(err));
      }

      var domain = Domain.create();
      domain.db = conn;
      domain.run(next);
    });

    var end = res.end;

    res.end = function(data, encoding, callback) {
      conn.query('COMMIT', function() {
        done();
        end.call(res, data, encoding, callback);
      });
    }

  });
}

module.exports = function(app) {
  app.use(transaction);
}