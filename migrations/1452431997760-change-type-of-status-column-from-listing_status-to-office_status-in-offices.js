'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = ['ALTER TABLE offices ALTER COLUMN status TYPE text USING status::text;' +
          'ALTER TABLE offices ALTER COLUMN status TYPE office_status USING status::office_status;'];

var down = ['ALTER TABLE offices ALTER COLUMN status TYPE text USING status::text;' +
            'ALTER TABLE offices ALTER COLUMN status TYPE listing_status USING status::listing_status;'];

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
