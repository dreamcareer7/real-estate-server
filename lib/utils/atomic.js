var Domain       = require('domain');
var config       = require('../config.js');
var db           = require('./db.js');

function transaction(req, res, next) {
  db.conn(function(err, conn, done) {
    var domain = Domain.create();
    if(err) {
      return next(Error.Database(err));
    }

    var rollback = function() {
      console.log('<- Rolling back'.red, req.method.yellow, req.url);
      conn.query('ROLLBACK', done);
    };

    conn.query('BEGIN', function(err) {
      if(err) {
        return next(Error.Database(err));
      }

      domain.db = conn;
      domain.jobs = [];

      return domain.run(next);
    });

    var end = res.end;

    var handled = false;
    domain.on('error', function(e) {
      // Request comes through, 3 async operations start. Lets call them a,b,c.
      // a fails.
      // We rollback and send error
      // b fails, but we already have rolled back the connection and released the connection and sent the error
      // So just ignore b.
      // Working of this situation is tested by unit test atomic/async_fail.
      // /GET/admin/async_fail emits this situation
      if(handled)
        return ;
      handled = true;

      // res.end() is hijacked by us to COMMIT when we're done.
      // Since we want to close the connection, we need to use res.error()
      // but res.error will end up commiting since it uses the hijacked version of res.end()
      // So we undo our hijacking of res.end() and make sure we can safely do res.error()
      res.end = end;


      delete e.domain;
      delete e.domainThrown;
      delete e.domainEmitter;
      delete e.domainBound;

      if(!e.http)
        e.http = 500;

      res.status(e.http);

      if(e.http >= 500)
        res.json({message: 'Internal Error'});
      else
        res.json(e);

      console.log('⚠ Panic:'.yellow, e, e.stack);
      rollback();
    });

    res.end = function(data, encoding, callback) {
      conn.query('COMMIT', function() {
        Job.handle(domain.jobs, err => {
          if(err)
            console.log('⚠ SOCKET JOB Panic:'.red, err, err.stack);

          end.call(res, data, encoding, callback);
          done();
        });
      });
    };

    // You might want to ask yourself why this is necessary?
    // Looks like that res.end() does not get called if a connection gets
    // terminated halfway through. What happens is a sequence of funny events known to our team as
    // "The Fucking Timeout Issues". We make sure that if a request gets closed for any reason,
    // we do a rollback on current transction and immediately terminate whatever we're doing.
    req.on('close', function() {
      console.log('× Connection closed by peer', req.url);
      rollback();
    });
  });
}

module.exports = function(app) {
  app.use(transaction);

  app.on('after loading routes', () => {
    app.use((err, req, res, next) => {
      process.domain.emit('error', err);
    });
  });
};
