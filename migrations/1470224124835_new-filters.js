'use strict';

var async = require('async');
var db = require('../lib/utils/db');
var listings_filters = fs.readFileSync('./lib/sql/alert/listings_filters.mv.sql').toString();

var up = [
  'ALTER TABLE alerts ALTER COLUMN listing_statuses DROP DEFAULT',
  'ALTER TABLE alerts ALTER COLUMN listing_statuses DROP NOT NULL',
  'ALTER TABLE alerts ALTER COLUMN minimum_price DROP NOT NULL',
  'ALTER TABLE alerts ALTER COLUMN maximum_price DROP NOT NULL',
  'ALTER TABLE alerts ALTER COLUMN minimum_square_meters DROP NOT NULL',
  'ALTER TABLE alerts ALTER COLUMN maximum_square_meters DROP NOT NULL',
  'ALTER TABLE alerts ALTER COLUMN minimum_bedrooms DROP NOT NULL',
  'ALTER TABLE alerts ALTER COLUMN minimum_bathrooms DROP NOT NULL',
  'ALTER TABLE alerts ALTER COLUMN property_subtypes DROP NOT NULL',
  'ALTER TABLE alerts ADD COLUMN list_agents text[] DEFAULT NULL',
  'ALTER TABLE alerts ADD COLUMN list_offices text[] DEFAULT NULL',
  'ALTER TABLE alerts ADD COLUMN counties text[] DEFAULT NULL',
  'ALTER TABLE alerts ADD COLUMN minimum_parking_spaces smallint DEFAULT NULL',
  'ALTER TABLE alerts ADD COLUMN architectural_styles text[] DEFAULT NULL',
  'ALTER TABLE alerts ADD COLUMN subdivisions text[] DEFAULT NULL',
  'ALTER TABLE alerts ADD COLUMN school_districts text[] DEFAULT NULL',
  'ALTER TABLE alerts ADD COLUMN primary_schools text[] DEFAULT NULL',
  'ALTER TABLE alerts ADD COLUMN elementary_schools text[] DEFAULT NULL',
  'ALTER TABLE alerts ADD COLUMN senior_high_schools text[] DEFAULT NULL',
  'ALTER TABLE alerts ADD COLUMN junior_high_schools text[] DEFAULT NULL',
  'ALTER TABLE alerts ADD COLUMN intermediate_schools text[] DEFAULT NULL',
  'ALTER TABLE alerts ADD COLUMN sort_order text[] DEFAULT NULL',
  'ALTER TABLE alerts ADD COLUMN sort_office uuid DEFAULT NULL',
  'ALTER TABLE alerts ADD COLUMN mls_areas jsonb DEFAULT NULL',
  'ALTER TABLE alerts DROP COLUMN dom',
  'ALTER TABLE alerts DROP COLUMN cdom',
  'ALTER TABLE alerts DROP COLUMN cover_image_url',
  'ALTER TABLE alerts DROP COLUMN currency',
  'ALTER TABLE alerts DROP COLUMN mls_area_major',
  'ALTER TABLE alerts DROP COLUMN mls_area_minor',
  'DROP MATERIALIZED VIEW listings_filters',
  listings_filters
];

var down = [
  'ALTER TABLE alerts ALTER COLUMN listing_statuses SET DEFAULT \'{Active}\'::listing_status[];',
  'ALTER TABLE alerts ALTER COLUMN listing_statuses SET NOT NULL',
  'ALTER TABLE alerts ALTER COLUMN minimum_price SET NOT NULL',
  'ALTER TABLE alerts ALTER COLUMN maximum_price SET NOT NULL',
  'ALTER TABLE alerts ALTER COLUMN minimum_square_meters SET NOT NULL',
  'ALTER TABLE alerts ALTER COLUMN maximum_square_meters SET NOT NULL',
  'ALTER TABLE alerts ALTER COLUMN minimum_bedrooms SET NOT NULL',
  'ALTER TABLE alerts ALTER COLUMN minimum_bathrooms SET NOT NULL',
  'ALTER TABLE alerts ALTER COLUMN property_subtypes SET NOT NULL',
  'ALTER TABLE alerts DROP COLUMN list_agents',
  'ALTER TABLE alerts DROP COLUMN list_offices',
  'ALTER TABLE alerts DROP COLUMN minimum_parking_spaces',
  'ALTER TABLE alerts DROP COLUMN architectural_styles',
  'ALTER TABLE alerts DROP COLUMN subdivisions',
  'ALTER TABLE alerts DROP COLUMN school_districts',
  'ALTER TABLE alerts DROP COLUMN primary_schools',
  'ALTER TABLE alerts DROP COLUMN elementary_schools',
  'ALTER TABLE alerts DROP COLUMN senior_high_schools',
  'ALTER TABLE alerts DROP COLUMN junior_high_schools',
  'ALTER TABLE alerts DROP COLUMN intermediate_schools',
  'ALTER TABLE alerts DROP COLUMN sort_office',
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
