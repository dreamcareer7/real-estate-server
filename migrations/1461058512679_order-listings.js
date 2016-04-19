'use strict';

var async = require('async');
var db = require('../lib/utils/db');
var fs = require('fs');
var fn = fs.readFileSync('./lib/sql/listing/order_listings.fn.sql').toString();

var up = [
  'BEGIN',
  fn,
  'CREATE INDEX listings_filters_status_order ON listings_filters(order_listings(status))',
  'COMMIT'
];

var down = [
  'DROP FUNCTION order_listings(listing_status) CASCADE;'
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
