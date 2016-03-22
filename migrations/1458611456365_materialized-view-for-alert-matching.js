'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var create = "CREATE MATERIALIZED VIEW listings_filters AS SELECT \
  listings.id as id, \
  listings.status as status, \
  listings.price as price, \
  listings.matrix_unique_id as matrix_unique_id, \
  listings.close_date as close_date, \
  properties.square_meters, \
  properties.bedroom_count, \
  properties.half_bathroom_count, \
  properties.full_bathroom_count, \
  properties.property_type, \
  properties.property_subtype, \
  properties.year_built, \
  properties.pool_yn, \
  properties.lot_square_meters, \
  addresses.location \
FROM listings \
JOIN \
  properties ON listings.property_id = properties.id \
JOIN \
  addresses  ON properties.address_id = addresses.id";

var up = [
  'BEGIN',
  create,
  'CREATE UNIQUE INDEX listings_filters_id ON listings_filters(id)',
  'CREATE INDEX listings_filters_location ON listings_filters USING GIST (location)',
  'CREATE INDEX listings_filters_status ON listings_filters (status)',
  'COMMIT'
];

var down = [
  'DROP MATERIALIZED VIEW listings_filters'
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
