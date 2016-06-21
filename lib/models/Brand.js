/**
 * @namespace Session
 */

var db            = require('../utils/db.js');
var validator     = require('../utils/validator.js');
var fs            = require('fs');

var sql_get    = require('../sql/brand/get.sql');

Brand = {};


Brand.get = function(id, cb) {
  db.query(sql_get, [id], (err, res) => {
    if(err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Brand ' + id + ' not found'));

    cb(null, res.rows[0]);
  });
}

module.exports = function(){};
