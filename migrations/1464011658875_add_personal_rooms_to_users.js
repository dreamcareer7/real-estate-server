'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'ALTER type room_type ADD VALUE IF NOT EXISTS \'Personal\';',
  'BEGIN',
  'UPDATE rooms SET room_type = \'Group\';',
  'ALTER TABLE users ADD personal_room uuid REFERENCES rooms(id);',
  'WITH room_ins AS (\
     INSERT INTO rooms(\
       owner, room_type, client_type\
     )\
     SELECT id, \'Personal\'::room_type, \'Unknown\'::client_type\
     FROM users\
     WHERE personal_room IS NULL RETURNING owner as userid, id as roomid\
   )\
   INSERT INTO rooms_users(room, "user") SELECT roomid, userid FROM room_ins;',
  'COMMIT'
];

var down = [
  'BEGIN',
  'ALTER TABLE users DROP COLUMN personal_room;',
  'COMMIT'
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
