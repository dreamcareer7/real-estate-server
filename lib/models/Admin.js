var db = require('../utils/db.js');
var sql = require('../utils/require_sql.js');
var validator = require('../utils/validator.js');
var config = require('../config.js');
var async = require('async');

Admin = {};

var sql_listing_count_total = require('../sql/admin/listing_count_total.sql');

Admin.totalListings = function(status, cb) {
  if(!status)
    status = 'Any';

  db.query(sql_listing_count_total, [status], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, res.rows[0].total_count);
  });
}

module.exports = function(){};