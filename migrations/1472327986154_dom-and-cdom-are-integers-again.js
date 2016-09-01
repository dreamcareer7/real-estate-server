'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'ALTER TABLE listings ALTER dom TYPE int USING null',
  'ALTER TABLE listings ALTER cdom TYPE int USING null',
  'UPDATE listings SET \
    dom = ( \
      CASE WHEN LENGTH(mls_data.value->>\'DOM\') > 0 THEN (mls_data.value->>\'DOM\')::int ELSE NULL END \
    ), \
    cdom = ( \
      CASE WHEN LENGTH(mls_data.value->>\'CDOM\') > 0 THEN (mls_data.value->>\'CDOM\')::int ELSE NULL END \
    ) \
  FROM mls_data \
  WHERE listings.matrix_unique_id = mls_data.matrix_unique_id;'
];

var down = [
  'ALTER TABLE listings ALTER dom TYPE timestamp with time zone USING null',
  'ALTER TABLE listings ALTER cdom TYPE timestamp with time zone USING null'
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
