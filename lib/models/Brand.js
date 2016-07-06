/**
 * @namespace Session
 */

var db            = require('../utils/db.js');
var validator     = require('../utils/validator.js');
var fs            = require('fs');

var sql_get              = require('../sql/brand/get.sql');
var sql_get_by_subdomain = require('../sql/brand/get_subdomain.sql');

Brand = {};

Brand.get = function(id, cb) {
  db.query(sql_get, [id], (err, res) => {
    if(err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Brand ' + id + ' not found'));

    return cb(null, res.rows[0]);
  });
};

Brand.getBySubdomain = function(subdomain, cb) {
  db.query(sql_get_by_subdomain, [subdomain], (err, res) => {
    if(err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Brand ' + subdomain + ' not found'));


    return Brand.get(res.rows[0].id, cb);
  });
};

module.exports = function(){};
