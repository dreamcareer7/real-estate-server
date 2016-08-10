var db                      = require('../utils/db.js');

var sql_search           = require('../sql/school/search.sql');
var sql_search_districts = require('../sql/school/search_districts.sql');
var sql_refresh          = require('../sql/school/refresh.sql');
var sql_district         = require('../sql/school/district.sql');

School = {}

School.search = function(term, cb) {
  db.query(sql_search, [term], (err, res) => {
    if(err)
      return cb(err);

    return cb(null, res.rows);
  });
}

School.getByDistrict = function(district, cb) {
  db.query(sql_district, [district], (err, res) => {
    if(err)
      return cb(err);

    return cb(null, res.rows);
  });
}

School.searchDistricts = function(term, cb) {
  db.query(sql_search_districts, [term], (err, res) => {
    if(err)
      return cb(err);

    return cb(null, res.rows);
  });
}

School.refresh = function(cb) {
  db.query(sql_refresh, [], cb);
}