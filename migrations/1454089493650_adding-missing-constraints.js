'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'ALTER TABLE recommendations_eav ADD CONSTRAINT recommendations_eav_user_recommendation_action_key UNIQUE ("user", recommendation, action)',
  'ALTER TABLE notifications_acks ALTER COLUMN id SET NOT NULL'
];

var down = [];

var runAll = (sqls, next) => {
  db.conn( (err, client) => {
    if(err)
      return next(err);

    async.eachSeries(sqls, client.query.bind(client), next);
  });
};

var run = (queries) => {
  return (next) => {
    runAll(queries, next);
  };
};

var remove = (id, cb) => {
  var q = 'DELETE FROM recommendations_eav WHERE id = $1';

  db.conn( (err, conn, done) => {
    if(err)
      return cb(err);

    conn.query(q, [id], (err) => {
      done();

      if(err)
        return cb(err);

      cb();
    });
  });
}

var clean = (cb) => {
  var q = 'SELECT ARRAY_AGG(id) as ids FROM recommendations_eav GROUP BY user, recommendation, action HAVING count(*) > 1';

  db.conn( (err, client, done) => {
    if(err)
      return cb(err);

    client.query(q, (err, res) => {
      done();
      if(err)
        return cb(err);

      var toDelete = [];

      res.rows.forEach( set => {
        set.ids.pop();
        toDelete = toDelete.concat(set.ids);
      });

      async.eachLimit(toDelete, 10, remove, cb);
    });
  });
}

exports.up = (cb) => {
  clean( err => {
    if(err)
      return cb(err);

    runAll(up, cb);
  });
}

exports.down = run(down);
