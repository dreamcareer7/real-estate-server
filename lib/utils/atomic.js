var Domain = require('domain');
var redis  = require('redis');
var config = require('../config.js');
var db     = require('./db.js');

var redisClient = redis.createClient(config.redis);

process.on('uncaughtException', (e) => {
  console.log('⚑ Uncaught exception:'.bgRed, e, e.stack);
});

function transaction(req, res, next) {
  db.conn(function(err, conn, done) {
    var domain = Domain.create();
    if(err) {
      return next(Error.Database(err));
    }

    var rollback = function() {
      console.log('<- Rolling back'.red, req.method.yellow, req.url);
      domain.dispose();
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

    domain.on('error', function(e) {
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

      if(e.http >= 500)
        res.json({message: 'Internal Error'});
      else
        res.json(e);

      console.log('⚠ Panic:'.yellow, e, e.stack);
      rollback();
    });

    res.end = function(data, encoding, callback) {
      conn.query('COMMIT', function() {
        done();
        domain.jobs.map( job => {
          job.save(err => {
            if (ObjectUtil.jobRequiresTracking(job)) {
              var key = ObjectUtil.getRedisJobKey(job);
              redisClient.set(key, job.id, err => {
                if(err)
                  console.log('ERROR setting job id for key', key.yellow, ':', err);
              });
            }
          });
        });
        end.call(res, data, encoding, callback);
      });
    };

    // You might want to ask yourself why this is necessary?
    // Looks like that res.end() does not get called if a connection gets
    // terminated halfway through. What happens is a sequence of funny events known to our team as
    // "The Fucking Timeout Issues". We make sure that if a request gets closed for any reason,
    // we do a rollback on current transction and immediately terminate whatever we're doing.
    req.on('close', rollback);
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
