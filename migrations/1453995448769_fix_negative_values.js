'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'UPDATE addresses set matrix_unique_id = NULL WHERE matrix_unique_id = -1;',
  'UPDATE properties set bedroom_count = NULL WHERE bedroom_count = -1;',
  'UPDATE properties set bathroom_count = NULL WHERE bathroom_count = -1.0;',
  'UPDATE properties set half_bathroom_count = NULL WHERE half_bathroom_count = -1.0;',
  'UPDATE properties set full_bathroom_count = NULL WHERE full_bathroom_count = -1.0;',
  'UPDATE properties set year_built = NULL WHERE year_built = -1;',
  'UPDATE properties set parking_spaces_covered_total = NULL WHERE parking_spaces_covered_total = -1.0;',
  'UPDATE properties set number_of_stories = NULL WHERE number_of_stories = -1;',
  'UPDATE properties set number_of_stories_in_building = NULL WHERE number_of_stories_in_building = -1;',
  'UPDATE properties set number_of_parking_spaces = NULL WHERE number_of_parking_spaces = -1.0;',
  'UPDATE properties set parking_spaces_carport = NULL WHERE parking_spaces_carport = -1.0;',
  'UPDATE properties set parking_spaces_garage = NULL WHERE parking_spaces_garage = -1.0;',
  'UPDATE properties set garage_length = NULL WHERE garage_length = -1.0;',
  'UPDATE properties set garage_width = NULL WHERE garage_width = -1.0;',
  'UPDATE properties set number_of_dining_areas = NULL WHERE number_of_dining_areas = -1;',
  'UPDATE properties set number_of_living_areas = NULL WHERE number_of_living_areas = -1;',
  'UPDATE properties set fireplaces_total = NULL WHERE fireplaces_total = -1;',
  'UPDATE properties set ceiling_height = NULL WHERE ceiling_height = -1.0;',
  'UPDATE properties set lot_size = NULL WHERE lot_size = -1.0;',
  'UPDATE properties set lot_size_area = NULL WHERE lot_size_area = -1.0;',
  'UPDATE properties set number_of_pets_allowed = NULL WHERE number_of_pets_allowed = -1.0;',
  'UPDATE properties set number_of_units = NULL WHERE number_of_units = -1;',
  'UPDATE properties set room_count = NULL WHERE room_count = -1;',
  'UPDATE properties set unit_count = NULL WHERE unit_count = -1;',
  'UPDATE listings set price = NULL WHERE price = 0;',
  'UPDATE listings set last_price = NULL WHERE last_price = 0;',
  'UPDATE listings set low_price = NULL WHERE low_price = 0;',
  'UPDATE listings set original_price = NULL WHERE original_price = 0;',
  'UPDATE listings set association_fee = NULL WHERE association_fee = 0;',
  'UPDATE listings set unexempt_taxes = NULL WHERE unexempt_taxes = 0;'
];

var down = [
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
