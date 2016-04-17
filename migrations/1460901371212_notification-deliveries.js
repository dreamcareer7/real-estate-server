var async = require('async');
var db = require('../lib/utils/db');

var up = [
'CREATE TABLE IF NOT EXISTS notifications_deliveries(id uuid DEFAULT uuid_generate_v1() PRIMARY KEY, \
"user" uuid NOT NULL REFERENCES users(id), \
"notification" uuid NOT NULL REFERENCES notifications(id), \
"device_token" text,\
"type" text,\
created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW(), deleted_at timestamptz);'
];

var down = [
  'DROP TABLE IF EXISTS notifications_deliveries'
];

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

exports.up = run(up);
exports.down = run(down);
