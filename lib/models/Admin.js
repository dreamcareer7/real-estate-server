/**
 * @namespace Admin
 */

var db                      = require('../utils/db.js');
var sql                     = require('../utils/require_sql.js');
var validator               = require('../utils/validator.js');
var config                  = require('../config.js');
var async                   = require('async');

var sql_listing_count_total = require('../sql/admin/listing_count_total.sql');

Admin = {};

/**
 * Returns total number of `Listing` objects recorded on Rechat with a specified status
 * @name totalListings
 * @function
 * @memberof Admin
 * @instance
 * @public
 * @param {Listing#listing_status} status - listings with this status will be considered
 * @param {callback} cb - callback function
 * @returns {number} number of listings having supplied status
 */
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